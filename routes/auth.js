const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/login', { error: null, registered: req.query.registered || null, title: 'Login' });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('auth/login', { error: 'Invalid email or password', registered: null, title: 'Login' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role, state: user.state };
  res.redirect('/dashboard');
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('auth/register', { error: null, title: 'Register' });
});

router.post('/register', (req, res) => {
  const { name, email, password, phone, state } = req.body;
  if (!name || !email || !password) {
    return res.render('auth/register', { error: 'All fields are required', title: 'Register' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.render('auth/register', { error: 'Email already registered', title: 'Register' });
  }
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (name, email, password, phone, state) VALUES (?, ?, ?, ?, ?)').run(name, email, hash, phone || '', state || '');
  res.redirect('/login?registered=1');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
