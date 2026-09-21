const { isGmail, getValidAccessCodes, createSessionToken } = require('../lib/auth');
const { recordBetaUser } = require('../lib/firebase');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-beta-token');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { email, accessCode } = body;

    // Validate email
    if (!email || !isGmail(email)) {
      res.status(400).json({
        error: 'Access restricted: Only valid Gmail addresses (@gmail.com) are accepted for this closed beta.',
      });
      return;
    }

    // Validate 6-digit access code
    const validCodes = getValidAccessCodes();
    const cleanCode = (accessCode || '').trim();

    if (!cleanCode || !validCodes.includes(cleanCode)) {
      res.status(403).json({
        error: 'Invalid 6-digit access code. Please check your invite.',
      });
      return;
    }

    // Record verified user in Firebase
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    await recordBetaUser(email, cleanCode, { ip, userAgent });

    // Generate signed JWT session token (valid for 30 days)
    const token = createSessionToken(email);

    res.status(200).json({
      success: true,
      email: email.trim().toLowerCase(),
      token,
      message: 'Access granted. Welcome to the closed beta!',
    });
  } catch (err) {
    console.error('Error in /api/verify-access:', err);
    res.status(500).json({ error: 'Internal server error during verification.' });
  }
};
