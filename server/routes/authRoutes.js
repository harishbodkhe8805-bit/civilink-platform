const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, getMemoryStore, isFallback } = require('../config/db');
const { verifyToken, JWT_SECRET } = require('../middleware/authMiddleware');

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'ADMIN_MASTER_SECRET_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate Token Helper
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// 1. Public User / NGO / Org Registration
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, organization_name, bio } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    // Role check: Admin cannot register through standard public registration
    const userRole = (role || 'USER').toUpperCase();
    if (userRole === 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin registration requires the Master Admin Key. Use Admin Registration.'
      });
    }

    if (!['USER', 'NGO', 'ORG'].includes(userRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role selected.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (!isFallback()) {
      const pool = getPool();
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }

      const [result] = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, phone, organization_name, bio, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [name.trim(), email.toLowerCase().trim(), passwordHash, userRole, phone || null, organization_name || null, bio || null]
      );

      const newUser = {
        id: result.insertId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: userRole,
        phone: phone || null,
        organization_name: organization_name || null,
        status: 'ACTIVE'
      };

      const token = generateToken(newUser);
      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token,
        user: newUser
      });
    } else {
      const memory = getMemoryStore();
      const existing = memory.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (existing) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }

      const newUser = {
        id: memory.nextIds.users++,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role: userRole,
        phone: phone || null,
        organization_name: organization_name || null,
        bio: bio || null,
        status: 'ACTIVE',
        created_at: new Date()
      };
      memory.users.push(newUser);

      const token = generateToken(newUser);
      const { password_hash, ...safeUser } = newUser;
      return res.status(201).json({
        success: true,
        message: 'Account created successfully!',
        token,
        user: safeUser
      });
    }
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, error: 'Registration failed. ' + err.message });
  }
});

// 2. Admin Registration with Fixed Secret Key
router.post('/admin/register', async (req, res) => {
  try {
    const { name, email, password, phone, adminSecretKey } = req.body;

    if (!name || !email || !password || !adminSecretKey) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, password, and the Admin Secret Key are all required.'
      });
    }

    // Verify Admin Secret Passkey
    if (adminSecretKey.trim() !== ADMIN_SECRET_KEY.trim()) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Admin Secret Key. You do not have authorization to create an Administrator account.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (!isFallback()) {
      const pool = getPool();
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }

      const [result] = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, phone, organization_name, bio, status)
         VALUES (?, ?, ?, 'ADMIN', ?, 'Platform Administration', 'Master Administrator', 'ACTIVE')`,
        [name.trim(), email.toLowerCase().trim(), passwordHash, phone || null]
      );

      const newAdmin = {
        id: result.insertId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'ADMIN',
        phone: phone || null,
        organization_name: 'Platform Administration',
        status: 'ACTIVE'
      };

      const token = generateToken(newAdmin);
      return res.status(201).json({
        success: true,
        message: 'Admin account created successfully with master permissions!',
        token,
        user: newAdmin
      });
    } else {
      const memory = getMemoryStore();
      const existing = memory.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
      if (existing) {
        return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      }

      const newAdmin = {
        id: memory.nextIds.users++,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        role: 'ADMIN',
        phone: phone || null,
        organization_name: 'Platform Administration',
        bio: 'Master Administrator',
        status: 'ACTIVE',
        created_at: new Date()
      };
      memory.users.push(newAdmin);

      const token = generateToken(newAdmin);
      const { password_hash, ...safeAdmin } = newAdmin;
      return res.status(201).json({
        success: true,
        message: 'Admin account created successfully with master permissions!',
        token,
        user: safeAdmin
      });
    }
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ success: false, error: 'Admin registration failed. ' + err.message });
  }
});

// 3. Unified Login for all roles (USER, NGO, ORG, ADMIN)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide both email and password.' });
    }

    let user = null;
    if (!isFallback()) {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT id, name, email, password_hash, role, phone, organization_name, bio, status FROM users WHERE email = ?',
        [email.toLowerCase().trim()]
      );
      if (rows.length > 0) user = rows[0];
    } else {
      const memory = getMemoryStore();
      user = memory.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Check account status
    if (user.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        error: 'Your account has been suspended by the administrator. Please contact support.'
      });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      organization_name: user.organization_name,
      bio: user.bio,
      status: user.status
    };

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed. ' + err.message });
  }
});

// 4. Get Current User Profile (Token validation)
router.get('/me', verifyToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;
