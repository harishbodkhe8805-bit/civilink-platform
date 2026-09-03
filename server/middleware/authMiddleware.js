const jwt = require('jsonwebtoken');
const { getPool, getMemoryStore, isFallback } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'community_platform_super_secret_jwt_key_2026';

// Middleware to verify JWT token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data from DB/store to verify active status
    let user = null;
    if (!isFallback()) {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT id, name, email, role, phone, organization_name, status FROM users WHERE id = ?',
        [decoded.id]
      );
      if (rows.length > 0) user = rows[0];
    } else {
      const memory = getMemoryStore();
      user = memory.users.find(u => u.id === decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User account no longer exists. Please register or log in again.'
      });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended by an administrator.'
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      organization_name: user.organization_name,
      status: user.status
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

// Optional Auth (for public listings that show personalized status if logged in)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!isFallback()) {
      const pool = getPool();
      const [rows] = await pool.query('SELECT id, name, email, role, status FROM users WHERE id = ?', [decoded.id]);
      if (rows.length > 0 && rows[0].status !== 'BLOCKED') {
        req.user = rows[0];
      }
    } else {
      const memory = getMemoryStore();
      const user = memory.users.find(u => u.id === decoded.id);
      if (user && user.status !== 'BLOCKED') {
        req.user = user;
      }
    }
  } catch (e) {
    req.user = null;
  }
  next();
}

// Middleware to restrict access by role
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. This resource is restricted to: ${allowedRoles.join(', ')}. Your role is: ${req.user.role}.`
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  JWT_SECRET
};
