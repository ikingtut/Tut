const jwt = require('jsonwebtoken');

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function internalApiKeyMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined);
  if (!apiKey || apiKey !== process.env.SIGNALING_API_KEY) {
    return res.status(401).json({ error: 'Invalid internal API key' });
  }
  next();
}

module.exports = {
  generateToken,
  authMiddleware,
  internalApiKeyMiddleware
};
