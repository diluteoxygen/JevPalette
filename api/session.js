const { extractTokenFromRequest, verifySessionToken } = require('../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-beta-token');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const token = extractTokenFromRequest(req);
  const payload = verifySessionToken(token);

  if (!payload) {
    res.status(200).json({ authenticated: false });
    return;
  }

  res.status(200).json({
    authenticated: true,
    email: payload.email,
  });
};
