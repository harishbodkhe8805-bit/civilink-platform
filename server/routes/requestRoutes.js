const express = require('express');
const router = express.Router();
const { getPool, getMemoryStore, isFallback } = require('../config/db');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');
const { sendNewRequestAdminAlert } = require('../services/emailService');

// 1. Get all approved community requests (or all if admin)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, urgency, search } = req.query;
    const isAdmin = req.user && req.user.role === 'ADMIN';

    if (!isFallback()) {
      const pool = getPool();
      let query = `
        SELECT 
          r.*,
          u.name AS user_name, u.email AS user_email, u.role AS user_role, u.organization_name AS user_org
        FROM help_requests r
        JOIN users u ON r.user_id = u.id
        WHERE 1=1
      `;
      const params = [];

      // Non-admins see only APPROVED requests, or their own
      if (!isAdmin) {
        if (req.user) {
          query += ' AND (r.status = "APPROVED" OR r.user_id = ?)';
          params.push(req.user.id);
        } else {
          query += ' AND r.status = "APPROVED"';
        }
      }

      if (category && category !== 'ALL') {
        query += ' AND r.category = ?';
        params.push(category);
      }
      if (urgency && urgency !== 'ALL') {
        query += ' AND r.urgency = ?';
        params.push(urgency);
      }
      if (search) {
        query += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.location LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      query += ' ORDER BY r.created_at DESC';

      const [rows] = await pool.query(query, params);
      return res.json({ success: true, requests: rows });
    } else {
      const memory = getMemoryStore();
      let list = memory.requests.map(r => {
        const u = memory.users.find(usr => usr.id === r.user_id) || {};
        return {
          ...r,
          user_name: u.name || r.user_name || 'Requester',
          user_email: u.email || r.user_email || '',
          user_role: u.role || r.user_role || 'USER',
          user_org: u.organization_name || null
        };
      });

      if (!isAdmin) {
        if (req.user) {
          list = list.filter(r => r.status === 'APPROVED' || r.user_id === req.user.id);
        } else {
          list = list.filter(r => r.status === 'APPROVED');
        }
      }

      if (category && category !== 'ALL') {
        list = list.filter(r => r.category.toLowerCase() === category.toLowerCase());
      }
      if (urgency && urgency !== 'ALL') {
        list = list.filter(r => r.urgency === urgency);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.location.toLowerCase().includes(q));
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return res.json({ success: true, requests: list });
    }
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch requests.' });
  }
});

// 2. Get current user's submitted requests
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!isFallback()) {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT * FROM help_requests WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
      return res.json({ success: true, requests: rows });
    } else {
      const memory = getMemoryStore();
      const myRequests = memory.requests.filter(r => r.user_id === userId);
      return res.json({ success: true, requests: myRequests });
    }
  } catch (err) {
    console.error('Error fetching user requests:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch your requests.' });
  }
});

// 3. Submit a new community help request
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, category, urgency, contact_info, location, latitude, longitude } = req.body;

    if (!title || !description || !category || !contact_info || !location) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, category, contact info, and location are required.'
      });
    }

    const urgencyLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(urgency) ? urgency : 'MEDIUM';
    const lat = (latitude !== undefined && latitude !== null && latitude !== '') ? parseFloat(latitude) : null;
    const lng = (longitude !== undefined && longitude !== null && longitude !== '') ? parseFloat(longitude) : null;

    if (!isFallback()) {
      const pool = getPool();
      const [result] = await pool.query(
        `INSERT INTO help_requests (title, description, category, urgency, contact_info, location, latitude, longitude, user_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [title.trim(), description.trim(), category, urgencyLevel, contact_info.trim(), location.trim(), lat, lng, req.user.id]
      );

      // Trigger Admin Email Alert with GPS coordinates
      sendNewRequestAdminAlert({
        userName: req.user.name,
        userEmail: req.user.email,
        requestTitle: title.trim(),
        category,
        urgency: urgencyLevel,
        location: location.trim(),
        latitude: lat,
        longitude: lng,
        contactInfo: contact_info.trim()
      }).catch(err => console.error('[Email Admin Alert Error]', err));

      return res.status(201).json({
        success: true,
        message: 'Request submitted! It will be reviewed by an administrator shortly.',
        requestId: result.insertId
      });
    } else {
      const memory = getMemoryStore();
      const newReq = {
        id: memory.nextIds.requests++,
        title: title.trim(),
        description: description.trim(),
        category,
        urgency: urgencyLevel,
        contact_info: contact_info.trim(),
        location: location.trim(),
        latitude: lat,
        longitude: lng,
        user_id: req.user.id,
        user_name: req.user.name,
        user_email: req.user.email,
        user_role: req.user.role,
        status: 'PENDING',
        admin_notes: null,
        created_at: new Date()
      };
      memory.requests.push(newReq);

      // Trigger Admin Email Alert
      sendNewRequestAdminAlert({
        userName: req.user.name,
        userEmail: req.user.email,
        requestTitle: title.trim(),
        category,
        urgency: urgencyLevel,
        location: location.trim(),
        latitude: lat,
        longitude: lng,
        contactInfo: contact_info.trim()
      }).catch(err => console.error('[Email Admin Alert Error]', err));

      return res.status(201).json({
        success: true,
        message: 'Request submitted! It will be reviewed by an administrator shortly.',
        request: newReq
      });
    }
  } catch (err) {
    console.error('Error submitting request:', err);
    res.status(500).json({ success: false, error: 'Failed to submit request.' });
  }
});

// 4. Delete request (Owner or Admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    if (!isFallback()) {
      const pool = getPool();
      const [rows] = await pool.query('SELECT user_id FROM help_requests WHERE id = ?', [requestId]);
      if (rows.length === 0) return res.status(404).json({ success: false, error: 'Request not found.' });

      if (rows[0].user_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this request.' });
      }

      await pool.query('DELETE FROM help_requests WHERE id = ?', [requestId]);
      return res.json({ success: true, message: 'Request deleted successfully.' });
    } else {
      const memory = getMemoryStore();
      const idx = memory.requests.findIndex(r => r.id === requestId);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Request not found.' });

      if (memory.requests[idx].user_id !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this request.' });
      }

      memory.requests.splice(idx, 1);
      return res.json({ success: true, message: 'Request deleted successfully.' });
    }
  } catch (err) {
    console.error('Error deleting request:', err);
    res.status(500).json({ success: false, error: 'Failed to delete request.' });
  }
});

module.exports = router;
