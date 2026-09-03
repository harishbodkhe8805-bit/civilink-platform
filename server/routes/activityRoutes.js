const express = require('express');
const router = express.Router();
const { getPool, getMemoryStore, isFallback } = require('../config/db');
const { verifyToken, optionalAuth, requireRole } = require('../middleware/authMiddleware');

// 1. Get all activities (Public with optional user context)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, search, status } = req.query;

    if (!isFallback()) {
      const pool = getPool();
      let query = `
        SELECT 
          a.id, a.title, a.description, a.category, a.location, a.event_date, 
          a.target_volunteers, a.status, a.created_at,
          u.name AS creator_name, u.role AS creator_role, u.organization_name AS creator_org,
          COUNT(DISTINCT ap.id) AS participant_count,
          ${req.user ? `MAX(CASE WHEN ap.user_id = ${req.user.id} AND ap.status = 'REGISTERED' THEN 1 ELSE 0 END)` : '0'} AS has_joined
        FROM activities a
        JOIN users u ON a.created_by = u.id
        LEFT JOIN activity_participants ap ON a.id = ap.activity_id AND ap.status = 'REGISTERED'
        WHERE 1=1
      `;
      const params = [];

      if (category && category !== 'ALL') {
        query += ' AND a.category = ?';
        params.push(category);
      }
      if (status && status !== 'ALL') {
        query += ' AND a.status = ?';
        params.push(status);
      }
      if (search) {
        query += ' AND (a.title LIKE ? OR a.description LIKE ? OR a.location LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      query += ' GROUP BY a.id ORDER BY a.event_date ASC';

      const [rows] = await pool.query(query, params);
      return res.json({ success: true, activities: rows });
    } else {
      const memory = getMemoryStore();
      let list = memory.activities.map(a => {
        const creator = memory.users.find(u => u.id === a.created_by) || {};
        const participants = memory.activity_participants.filter(p => p.activity_id === a.id && p.status === 'REGISTERED');
        const hasJoined = req.user ? participants.some(p => p.user_id === req.user.id) : false;

        return {
          ...a,
          creator_name: creator.name || a.creator_name || 'Organizer',
          creator_role: creator.role || a.creator_role || 'NGO',
          creator_org: creator.organization_name || null,
          participant_count: participants.length,
          has_joined: hasJoined ? 1 : 0
        };
      });

      if (category && category !== 'ALL') {
        list = list.filter(a => a.category.toLowerCase() === category.toLowerCase());
      }
      if (status && status !== 'ALL') {
        list = list.filter(a => a.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        list = list.filter(a => a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.location.toLowerCase().includes(q));
      }

      return res.json({ success: true, activities: list });
    }
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch activities. ' + err.message });
  }
});

// 2. Get single activity by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id, 10);

    if (!isFallback()) {
      const pool = getPool();
      const [rows] = await pool.query(
        `SELECT a.*, u.name AS creator_name, u.role AS creator_role, u.organization_name AS creator_org,
          COUNT(DISTINCT ap.id) AS participant_count,
          ${req.user ? `MAX(CASE WHEN ap.user_id = ${req.user.id} AND ap.status = 'REGISTERED' THEN 1 ELSE 0 END)` : '0'} AS has_joined
         FROM activities a
         JOIN users u ON a.created_by = u.id
         LEFT JOIN activity_participants ap ON a.id = ap.activity_id AND ap.status = 'REGISTERED'
         WHERE a.id = ?
         GROUP BY a.id`,
        [activityId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Activity not found.' });
      }

      // Fetch participants list
      const [participants] = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, ap.joined_at 
         FROM activity_participants ap
         JOIN users u ON ap.user_id = u.id
         WHERE ap.activity_id = ? AND ap.status = 'REGISTERED'`,
        [activityId]
      );

      return res.json({ success: true, activity: rows[0], participants });
    } else {
      const memory = getMemoryStore();
      const act = memory.activities.find(a => a.id === activityId);
      if (!act) return res.status(404).json({ success: false, error: 'Activity not found.' });

      const creator = memory.users.find(u => u.id === act.created_by) || {};
      const partRows = memory.activity_participants.filter(p => p.activity_id === activityId && p.status === 'REGISTERED');
      const participants = partRows.map(p => {
        const u = memory.users.find(usr => usr.id === p.user_id) || {};
        return { id: u.id, name: u.name, email: u.email, role: u.role, joined_at: p.joined_at };
      });

      const hasJoined = req.user ? partRows.some(p => p.user_id === req.user.id) : false;

      return res.json({
        success: true,
        activity: {
          ...act,
          creator_name: creator.name || 'Organizer',
          creator_role: creator.role || 'NGO',
          creator_org: creator.organization_name || null,
          participant_count: participants.length,
          has_joined: hasJoined ? 1 : 0
        },
        participants
      });
    }
  } catch (err) {
    console.error('Error fetching activity details:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch activity details.' });
  }
});

// 3. Create Activity (Restricted to NGO, ORG, and ADMIN)
router.post('/', verifyToken, requireRole('NGO', 'ORG', 'ADMIN'), async (req, res) => {
  try {
    const { title, description, category, location, event_date, target_volunteers } = req.body;

    if (!title || !description || !category || !location || !event_date) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, category, location, and event date are required.'
      });
    }

    if (!isFallback()) {
      const pool = getPool();
      const [result] = await pool.query(
        `INSERT INTO activities (title, description, category, location, event_date, target_volunteers, created_by, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'UPCOMING')`,
        [title.trim(), description.trim(), category, location.trim(), event_date, parseInt(target_volunteers, 10) || 0, req.user.id]
      );

      return res.status(201).json({
        success: true,
        message: 'Activity published successfully!',
        activityId: result.insertId
      });
    } else {
      const memory = getMemoryStore();
      const newActivity = {
        id: memory.nextIds.activities++,
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        event_date: new Date(event_date),
        target_volunteers: parseInt(target_volunteers, 10) || 0,
        created_by: req.user.id,
        creator_name: req.user.name,
        creator_role: req.user.role,
        status: 'UPCOMING',
        created_at: new Date()
      };
      memory.activities.push(newActivity);

      return res.status(201).json({
        success: true,
        message: 'Activity published successfully!',
        activity: newActivity
      });
    }
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ success: false, error: 'Failed to create activity. ' + err.message });
  }
});

// 4. Join an Activity (For registered Users/Volunteers)
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!isFallback()) {
      const pool = getPool();
      // Check activity exists
      const [acts] = await pool.query('SELECT id, status FROM activities WHERE id = ?', [activityId]);
      if (acts.length === 0) return res.status(404).json({ success: false, error: 'Activity not found.' });

      // Check if already registered
      const [exists] = await pool.query(
        'SELECT id, status FROM activity_participants WHERE activity_id = ? AND user_id = ?',
        [activityId, userId]
      );

      if (exists.length > 0) {
        if (exists[0].status === 'REGISTERED') {
          return res.status(400).json({ success: false, error: 'You are already registered for this activity!' });
        } else {
          // Re-register
          await pool.query('UPDATE activity_participants SET status = "REGISTERED", joined_at = NOW() WHERE id = ?', [exists[0].id]);
          return res.json({ success: true, message: 'Successfully re-registered for activity!' });
        }
      }

      await pool.query(
        'INSERT INTO activity_participants (activity_id, user_id, status) VALUES (?, ?, "REGISTERED")',
        [activityId, userId]
      );

      return res.json({ success: true, message: 'Successfully joined this activity!' });
    } else {
      const memory = getMemoryStore();
      const act = memory.activities.find(a => a.id === activityId);
      if (!act) return res.status(404).json({ success: false, error: 'Activity not found.' });

      const existing = memory.activity_participants.find(p => p.activity_id === activityId && p.user_id === userId);
      if (existing) {
        if (existing.status === 'REGISTERED') {
          return res.status(400).json({ success: false, error: 'You are already registered for this activity!' });
        }
        existing.status = 'REGISTERED';
        existing.joined_at = new Date();
      } else {
        memory.activity_participants.push({
          id: memory.nextIds.activity_participants++,
          activity_id: activityId,
          user_id: userId,
          status: 'REGISTERED',
          joined_at: new Date()
        });
      }

      return res.json({ success: true, message: 'Successfully joined this activity!' });
    }
  } catch (err) {
    console.error('Error joining activity:', err);
    res.status(500).json({ success: false, error: 'Failed to join activity.' });
  }
});

// 5. Leave an Activity
router.post('/:id/leave', verifyToken, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id, 10);
    const userId = req.user.id;

    if (!isFallback()) {
      const pool = getPool();
      await pool.query(
        'DELETE FROM activity_participants WHERE activity_id = ? AND user_id = ?',
        [activityId, userId]
      );
      return res.json({ success: true, message: 'You have cancelled your participation.' });
    } else {
      const memory = getMemoryStore();
      const idx = memory.activity_participants.findIndex(p => p.activity_id === activityId && p.user_id === userId);
      if (idx !== -1) {
        memory.activity_participants.splice(idx, 1);
      }
      return res.json({ success: true, message: 'You have cancelled your participation.' });
    }
  } catch (err) {
    console.error('Error leaving activity:', err);
    res.status(500).json({ success: false, error: 'Failed to leave activity.' });
  }
});

// 6. Delete Activity (Owner or Admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const activityId = parseInt(req.params.id, 10);

    if (!isFallback()) {
      const pool = getPool();
      const [acts] = await pool.query('SELECT * FROM activities WHERE id = ?', [activityId]);
      if (acts.length === 0) return res.status(404).json({ success: false, error: 'Activity not found.' });

      if (acts[0].created_by !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Unauthorized. Only the organizer or admin can delete this.' });
      }

      await pool.query('DELETE FROM activities WHERE id = ?', [activityId]);
      return res.json({ success: true, message: 'Activity deleted successfully.' });
    } else {
      const memory = getMemoryStore();
      const idx = memory.activities.findIndex(a => a.id === activityId);
      if (idx === -1) return res.status(404).json({ success: false, error: 'Activity not found.' });

      const act = memory.activities[idx];
      if (act.created_by !== req.user.id && req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Unauthorized. Only the organizer or admin can delete this.' });
      }

      memory.activities.splice(idx, 1);
      // Remove participants
      memory.activity_participants = memory.activity_participants.filter(p => p.activity_id !== activityId);
      return res.json({ success: true, message: 'Activity deleted successfully.' });
    }
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ success: false, error: 'Failed to delete activity.' });
  }
});

module.exports = router;
