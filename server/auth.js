import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TOKEN_EXPIRY = '30d';

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing JWT_SECRET');
  }
  return jwt.sign({ sub: String(userId) }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function tokenFromHeader(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

// Requires a valid token; rejects the request if missing/invalid.
export function requireAuth(req, res, next) {
  const token = tokenFromHeader(req);
  if (!token || !process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'You need to be logged in for this.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

// Decodes a token if present but does not require one - used for routes
// that behave the same for guests and logged-in users, just with extra
// info (like "your rating") when logged in.
export function optionalAuth(req, _res, next) {
  const token = tokenFromHeader(req);
  if (token && process.env.JWT_SECRET) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = payload.sub;
    } catch {
      // ignore invalid/expired token - treat as guest
    }
  }
  next();
}
