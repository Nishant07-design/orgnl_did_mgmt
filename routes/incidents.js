const express = require('express');
const db = require('../database/db');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// List incidents page
router.get('/', (req, res) => {
  const { type, severity, state, status } = req.query;
  let query = 'SELECT i.*, u.name as reporter_name FROM incidents i LEFT JOIN users u ON i.reported_by = u.id WHERE 1=1';
  const params = [];
  if (type) { query += ' AND i.type = ?'; params.push(type); }
  if (severity) { query += ' AND i.severity = ?'; params.push(severity); }
  if (state) { query += ' AND i.state = ?'; params.push(state); }
  if (status) { query += ' AND i.status = ?'; params.push(status); }
  query += ' ORDER BY i.created_at DESC';
  const incidents = db.prepare(query).all(...params);
  const states = db.prepare('SELECT DISTINCT state FROM incidents ORDER BY state').all();
  res.render('incidents/index', { incidents, states, filters: req.query, reported: req.query.reported || null, title: 'Active Incidents', user: req.session.user });
});

// Report new incident form
router.get('/report', requireAuth, (req, res) => {
  res.render('incidents/report', { error: null, title: 'Report Incident', user: req.session.user });
});

// Submit report
router.post('/report', requireAuth, (req, res) => {
  const { title, type, description, location, district, state, lat, lng, severity, affected_people } = req.body;
  if (!title || !type || !location) {
    return res.render('incidents/report', { error: 'Title, type and location are required', title: 'Report Incident', user: req.session.user });
  }
  const result = db.prepare(`
    INSERT INTO incidents (title, type, description, location, district, state, lat, lng, severity, reported_by, affected_people)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, type, description || '', location, district || '', state || '', lat || null, lng || null, severity || 'medium', req.session.user.id, affected_people || 0);

  // Auto-create alert for critical incidents
  if (severity === 'critical' || severity === 'high') {
    db.prepare(`INSERT INTO alerts (title, message, severity, type, incident_id, state, district, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
      `ALERT: ${title}`,
      `New ${severity} incident reported at ${location}. ${description || ''}`.slice(0, 200),
      severity, 'incident', result.lastInsertRowid, state || '', district || '', req.session.user.id
    );
  }

  res.redirect('/incidents?reported=1');
});

// View single incident
router.get('/:id', (req, res) => {
  const incident = db.prepare('SELECT i.*, u.name as reporter_name FROM incidents i LEFT JOIN users u ON i.reported_by = u.id WHERE i.id = ?').get(req.params.id);
  if (!incident) return res.redirect('/incidents');
  const ops = db.prepare('SELECT * FROM rescue_operations WHERE incident_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.render('incidents/detail', { incident, ops, title: incident.title, user: req.session.user });
});

// Update incident status (admin only)
router.post('/:id/status', requireAuth, (req, res) => {
  if (req.session.user.role !== 'admin') return res.redirect('/incidents/' + req.params.id);
  const { status } = req.body;
  db.prepare('UPDATE incidents SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
  res.redirect('/incidents/' + req.params.id);
});

// API: get incidents as JSON for map/SSE
router.get('/api/all', (req, res) => {
  const incidents = db.prepare('SELECT * FROM incidents WHERE status != "resolved" ORDER BY created_at DESC').all();
  res.json(incidents);
});

module.exports = router;
