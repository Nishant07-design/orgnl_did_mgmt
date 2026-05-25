const express = require('express');
const db = require('../database/db');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
  next();
}

router.get('/', (req, res) => {
  const alerts = db.prepare('SELECT a.*, u.name as creator_name FROM alerts a LEFT JOIN users u ON a.created_by = u.id WHERE a.active = 1 ORDER BY a.created_at DESC').all();
  res.render('alerts/index', { alerts, title: 'Emergency Alerts', user: req.session.user });
});

router.get('/broadcast', requireAdmin, (req, res) => {
  const incidents = db.prepare("SELECT id, title FROM incidents WHERE status = 'active' ORDER BY created_at DESC").all();
  res.render('alerts/broadcast', { incidents, error: null, title: 'Broadcast Alert', user: req.session.user });
});

router.post('/broadcast', requireAdmin, (req, res) => {
  const { title, message, severity, type, state, district, incident_id } = req.body;
  if (!title || !message) {
    const incidents = db.prepare("SELECT id, title FROM incidents WHERE status = 'active'").all();
    return res.render('alerts/broadcast', { incidents, error: 'Title and message are required', title: 'Broadcast Alert', user: req.session.user });
  }
  db.prepare(`INSERT INTO alerts (title, message, severity, type, state, district, incident_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    title, message, severity || 'info', type || 'general', state || '', district || '', incident_id || null, req.session.user.id
  );
  res.redirect('/alerts');
});

router.post('/:id/dismiss', requireAdmin, (req, res) => {
  db.prepare('UPDATE alerts SET active = 0 WHERE id = ?').run(req.params.id);
  res.redirect('/alerts');
});

// SSE endpoint for real-time alerts
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const send = () => {
    const alerts = db.prepare('SELECT * FROM alerts WHERE active = 1 ORDER BY created_at DESC LIMIT 5').all();
    const incidents = db.prepare('SELECT * FROM incidents WHERE status != "resolved" ORDER BY updated_at DESC LIMIT 10').all();
    const stats = {
      activeIncidents: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='active'").get().c,
      resolvedToday: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='resolved' AND date(updated_at) = date('now')").get().c,
      openShelters: db.prepare("SELECT COUNT(*) as c FROM shelters WHERE status='open'").get().c,
      activeAlerts: db.prepare('SELECT COUNT(*) as c FROM alerts WHERE active=1').get().c,
    };
    res.write(`data: ${JSON.stringify({ alerts, incidents, stats })}\n\n`);
  };

  send();
  const interval = setInterval(send, 8000);
  req.on('close', () => clearInterval(interval));
});

module.exports = router;
