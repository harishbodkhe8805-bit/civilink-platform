const express = require('express');
const router = express.Router();
const { getPool, getMemoryStore, isFallback } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { sendRequestStatusNotification } = require('../services/emailService');

// STRICT SECURITY: ALL ADMIN ROUTES REQUIRE ADMIN ROLE
router.use(verifyToken, requireRole('ADMIN'));

// 1. Admin System Stats Overview
router.get('/stats', async (req, res) => {
  try {
    if (!isFallback()) {
      const pool = getPool();
      const [[userCounts]] = await pool.query(`
        SELECT 
          COUNT(*) AS total_users,
          SUM(CASE WHEN role = 'USER' THEN 1 ELSE 0 END) AS total_individual_users,
          SUM(CASE WHEN role = 'NGO' THEN 1 ELSE 0 END) AS total_ngos,
          SUM(CASE WHEN role = 'ORG' THEN 1 ELSE 0 END) AS total_orgs,
          SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS total_admins,
          SUM(CASE WHEN status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_users
        FROM users
      `);

      const [[activityCounts]] = await pool.query(`
        SELECT 
          COUNT(*) AS total_activities,
          SUM(CASE WHEN status = 'UPCOMING' THEN 1 ELSE 0 END) AS upcoming_activities,
          SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_activities
        FROM activities
      `);

      const [[requestCounts]] = await pool.query(`
        SELECT 
          COUNT(*) AS total_requests,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_requests,
          SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) AS approved_requests,
          SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_requests
        FROM help_requests
      `);

      const [[participantCounts]] = await pool.query(`
        SELECT COUNT(*) AS total_volunteers_joined FROM activity_participants WHERE status = 'REGISTERED'
      `);

      return res.json({
        success: true,
        stats: {
          users: userCounts,
          activities: activityCounts,
          requests: requestCounts,
          volunteers: participantCounts
        }
      });
    } else {
      const memory = getMemoryStore();
      const users = memory.users;
      const acts = memory.activities;
      const reqs = memory.requests;
      const parts = memory.activity_participants;

      return res.json({
        success: true,
        stats: {
          users: {
            total_users: users.length,
            total_individual_users: users.filter(u => u.role === 'USER').length,
            total_ngos: users.filter(u => u.role === 'NGO').length,
            total_orgs: users.filter(u => u.role === 'ORG').length,
            total_admins: users.filter(u => u.role === 'ADMIN').length,
            blocked_users: users.filter(u => u.status === 'BLOCKED').length
          },
          activities: {
            total_activities: acts.length,
            upcoming_activities: acts.filter(a => a.status === 'UPCOMING').length,
            completed_activities: acts.filter(a => a.status === 'COMPLETED').length
          },
          requests: {
            total_requests: reqs.length,
            pending_requests: reqs.filter(r => r.status === 'PENDING').length,
            approved_requests: reqs.filter(r => r.status === 'APPROVED').length,
            rejected_requests: reqs.filter(r => r.status === 'REJECTED').length
          },
          volunteers: {
            total_volunteers_joined: parts.filter(p => p.status === 'REGISTERED').length
          }
        }
      });
    }
  } catch (err) {
    console.error('Error loading admin stats:', err);
    res.status(500).json({ success: false, error: 'Failed to load system statistics.' });
  }
});

// 2. User Management: List all users
router.get('/users', async (req, res) => {
  try {
    const { role, status, search } = req.query;

    if (!isFallback()) {
      const pool = getPool();
      let query = `
        SELECT 
          u.id, u.name, u.email, u.role, u.phone, u.organization_name, u.bio, u.status, u.created_at,
          COUNT(DISTINCT a.id) AS activities_count,
          COUNT(DISTINCT r.id) AS requests_count
        FROM users u
        LEFT JOIN activities a ON u.id = a.created_by
        LEFT JOIN help_requests r ON u.id = r.user_id
        WHERE 1=1
      `;
      const params = [];

      if (role && role !== 'ALL') {
        query += ' AND u.role = ?';
        params.push(role);
      }
      if (status && status !== 'ALL') {
        query += ' AND u.status = ?';
        params.push(status);
      }
      if (search) {
        query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.organization_name LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      query += ' GROUP BY u.id ORDER BY u.created_at DESC';

      const [rows] = await pool.query(query, params);
      return res.json({ success: true, users: rows });
    } else {
      const memory = getMemoryStore();
      let list = memory.users.map(u => {
        const { password_hash, ...safe } = u;
        const actCount = memory.activities.filter(a => a.created_by === u.id).length;
        const reqCount = memory.requests.filter(r => r.user_id === u.id).length;
        return {
          ...safe,
          activities_count: actCount,
          requests_count: reqCount
        };
      });

      if (role && role !== 'ALL') list = list.filter(u => u.role === role);
      if (status && status !== 'ALL') list = list.filter(u => u.status === status);
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.organization_name && u.organization_name.toLowerCase().includes(q)));
      }

      return res.json({ success: true, users: list });
    }
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch users list.' });
  }
});

// 3. User Management: Update user status (ACTIVE / BLOCKED / PENDING)
router.put('/users/:id/status', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['ACTIVE', 'BLOCKED', 'PENDING'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status provided.' });
    }

    if (userId === req.user.id && status === 'BLOCKED') {
      return res.status(400).json({ success: false, error: 'You cannot block your own admin account.' });
    }

    if (!isFallback()) {
      const pool = getPool();
      const [user] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
      if (user.length === 0) return res.status(404).json({ success: false, error: 'User not found.' });

      await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
      return res.json({ success: true, message: `User status changed to ${status}.` });
    } else {
      const memory = getMemoryStore();
      const user = memory.users.find(u => u.id === userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

      user.status = status;
      return res.json({ success: true, message: `User status changed to ${status}.` });
    }
  } catch (err) {
    console.error('Error updating user status:', err);
    res.status(500).json({ success: false, error: 'Failed to update user status.' });
  }
});

// 4. User Management: Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (userId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own admin account.' });
    }

    if (!isFallback()) {
      const pool = getPool();
      await pool.query('DELETE FROM users WHERE id = ?', [userId]);
      return res.json({ success: true, message: 'User deleted successfully.' });
    } else {
      const memory = getMemoryStore();
      const idx = memory.users.findIndex(u => u.id === userId);
      if (idx === -1) return res.status(404).json({ success: false, error: 'User not found.' });

      memory.users.splice(idx, 1);
      // Cascade delete activities, requests, participation
      memory.activities = memory.activities.filter(a => a.created_by !== userId);
      memory.requests = memory.requests.filter(r => r.user_id !== userId);
      memory.activity_participants = memory.activity_participants.filter(p => p.user_id !== userId);

      return res.json({ success: true, message: 'User deleted successfully.' });
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: 'Failed to delete user.' });
  }
});

// 5. Moderation Queue: Get all help requests
router.get('/requests', async (req, res) => {
  try {
    const { status } = req.query;

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

      if (status && status !== 'ALL') {
        query += ' AND r.status = ?';
        params.push(status);
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

      if (status && status !== 'ALL') {
        list = list.filter(r => r.status === status);
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json({ success: true, requests: list });
    }
  } catch (err) {
    console.error('Error loading moderation requests:', err);
    res.status(500).json({ success: false, error: 'Failed to load requests.' });
  }
});

// 6. Moderation: Approve / Reject / Resolve request
router.put('/requests/:id/moderate', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { status, admin_notes } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid moderation status.' });
    }

    let targetEmail = null;
    let targetName = null;
    let targetTitle = null;

    if (!isFallback()) {
      const pool = getPool();
      // Fetch requester and request info
      const [requestRows] = await pool.query(
        `SELECT r.title, u.name AS user_name, u.email AS user_email
         FROM help_requests r
         JOIN users u ON r.user_id = u.id
         WHERE r.id = ?`,
        [requestId]
      );

      if (requestRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Request not found.' });
      }

      targetTitle = requestRows[0].title;
      targetName = requestRows[0].user_name;
      targetEmail = requestRows[0].user_email;

      await pool.query(
        'UPDATE help_requests SET status = ?, admin_notes = ? WHERE id = ?',
        [status, admin_notes || null, requestId]
      );
    } else {
      const memory = getMemoryStore();
      const reqItem = memory.requests.find(r => r.id === requestId);
      if (!reqItem) return res.status(404).json({ success: false, error: 'Request not found.' });

      const user = memory.users.find(u => u.id === reqItem.user_id);
      targetTitle = reqItem.title;
      targetName = user ? user.name : (reqItem.user_name || 'Requester');
      targetEmail = user ? user.email : reqItem.user_email;

      reqItem.status = status;
      reqItem.admin_notes = admin_notes || null;
    }

    // Trigger Email Notification (non-blocking in background)
    if (targetEmail) {
      sendRequestStatusNotification({
        toEmail: targetEmail,
        userName: targetName || 'Community Member',
        requestTitle: targetTitle || 'Help Request',
        status: status,
        adminNotes: admin_notes || ''
      }).catch(err => console.error('[Email Notification Error]', err));
    }

    return res.json({
      success: true,
      message: `Request marked as ${status}. Email notification sent to ${targetEmail}.`
    });
  } catch (err) {
    console.error('Error moderating request:', err);
    res.status(500).json({ success: false, error: 'Failed to update request.' });
  }
});

module.exports = router;
