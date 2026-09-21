const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'typesafe_jev_beta_secret_default_key_2026';
const DEFAULT_ACCESS_CODES = ['849201', '371940', '592814', '164829', '902381'];

/**
 * Get list of valid 6-digit access codes from environment
 */
function getValidAccessCodes() {
  const envCodes = process.env.BETA_ACCESS_CODES;
  if (!envCodes) return DEFAULT_ACCESS_CODES;
  return envCodes.split(',').map(c => c.trim()).filter(Boolean);
}

/**
 * Validate that an email is strictly a Gmail address
 */
function isGmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[a-zA-Z0-9._%+-]+@(gmail|googlemail)\.com$/i;
  return regex.test(email.trim());
}

/**
 * Base64URL encode/decode utilities
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Generate a signed HMAC-SHA256 session token
 */
function createSessionToken(email, expiresInSeconds = 30 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    email: email.trim().toLowerCase(),
    beta: true,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${dataToSign}.${signature}`;
}

/**
 * Verify a session token. Returns the payload if valid, or null if invalid/expired.
 */
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  // Constant-time comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    if (!payload.beta || !payload.email) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Extract token from request headers (Authorization: Bearer <token> or x-beta-token)
 */
function extractTokenFromRequest(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.headers['x-beta-token']) {
    return req.headers['x-beta-token'].trim();
  }
  return null;
}

module.exports = {
  getValidAccessCodes,
  isGmail,
  createSessionToken,
  verifySessionToken,
  extractTokenFromRequest,
};
