const express = require('express');
const db = require('../database/db');
const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
  next();
}

router.get('/', (req, res) => {
  const { state, status } = req.query;
  let query = 'SELECT * FROM shelters WHERE 1=1';
  const params = [];
  if (state) { query += ' AND state = ?'; params.push(state); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY state, name';
  const shelters = db.prepare(query).all(...params);
  const states = db.prepare('SELECT DISTINCT state FROM shelters ORDER BY state').all();
  const stats = {
    total: db.prepare('SELECT COUNT(*) as c FROM shelters').get().c,
    open: db.prepare("SELECT COUNT(*) as c FROM shelters WHERE status='open'").get().c,
    totalCapacity: db.prepare('SELECT SUM(capacity) as s FROM shelters').get().s || 0,
    totalOccupancy: db.prepare('SELECT SUM(current_occupancy) as s FROM shelters').get().s || 0,
  };
  res.render('shelters/index', { shelters, states, filters: req.query, stats, title: 'Emergency Shelters', user: req.session.user });
});

router.get('/api/all', (req, res) => {
  const shelters = db.prepare('SELECT * FROM shelters ORDER BY state').all();
  res.json(shelters);
});

router.post('/:id/occupancy', requireAdmin, (req, res) => {
  const { current_occupancy } = req.body;
  const shelter = db.prepare('SELECT * FROM shelters WHERE id = ?').get(req.params.id);
  if (!shelter) return res.redirect('/shelters');
  const occ = Math.min(parseInt(current_occupancy) || 0, shelter.capacity);
  const status = occ >= shelter.capacity ? 'full' : 'open';
  db.prepare('UPDATE shelters SET current_occupancy = ?, status = ? WHERE id = ?').run(occ, status, req.params.id);
  res.redirect('/shelters');
});

module.exports = router;
