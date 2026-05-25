const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// If running behind Render or another proxy, trust the first proxy
app.set('trust proxy', 1);

// Session - Using in-memory store with JSON file fallback
app.use(session({
  secret: process.env.SESSION_SECRET || 'disaster-response-india-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Make user available in all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const shelterRoutes = require('./routes/shelters');
const alertRoutes = require('./routes/alerts');
const aiRoutes = require('./routes/ai');
const db = require('./database/db');

app.use('/', authRoutes);
app.use('/incidents', incidentRoutes);
app.use('/shelters', shelterRoutes);
app.use('/alerts', alertRoutes);
app.use('/ai-guide', aiRoutes);

// Home page
app.get('/', (req, res) => {
  const stats = {
    activeIncidents: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='active'").get().c,
    resolvedToday: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='resolved' AND date(updated_at)=date('now')").get().c,
    openShelters: db.prepare("SELECT COUNT(*) as c FROM shelters WHERE status='open'").get().c,
    totalCapacity: db.prepare("SELECT SUM(capacity) as s FROM shelters WHERE status='open'").get().s || 0,
    totalOccupancy: db.prepare("SELECT SUM(current_occupancy) as s FROM shelters").get().s || 0,
    activeAlerts: db.prepare('SELECT COUNT(*) as c FROM alerts WHERE active=1').get().c,
  };
  const recentIncidents = db.prepare("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 5").all();
  const activeAlerts = db.prepare("SELECT * FROM alerts WHERE active=1 ORDER BY created_at DESC LIMIT 3").all();
  res.render('home', { stats, recentIncidents, activeAlerts, title: 'Suraksha Setu - Emergency Response Platform' });
});

// Dashboard
app.get('/dashboard', (req, res) => {
  const stats = {
    activeIncidents: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='active'").get().c,
    criticalIncidents: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='active' AND severity='critical'").get().c,
    resolvedToday: db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status='resolved' AND date(updated_at)=date('now')").get().c,
    openShelters: db.prepare("SELECT COUNT(*) as c FROM shelters WHERE status='open'").get().c,
    totalCapacity: db.prepare("SELECT SUM(capacity) as s FROM shelters WHERE status='open'").get().s || 0,
    totalOccupancy: db.prepare("SELECT SUM(current_occupancy) as s FROM shelters").get().s || 0,
    activeAlerts: db.prepare('SELECT COUNT(*) as c FROM alerts WHERE active=1').get().c,
    activeRescue: db.prepare("SELECT COUNT(*) as c FROM rescue_operations WHERE status='active'").get().c,
    totalAffected: db.prepare("SELECT SUM(affected_people) as s FROM incidents WHERE status='active'").get().s || 0,
  };
  const incidents = db.prepare("SELECT * FROM incidents ORDER BY created_at DESC LIMIT 20").all();
  const alerts = db.prepare("SELECT a.*, u.name as creator_name FROM alerts a LEFT JOIN users u ON a.created_by=u.id WHERE a.active=1 ORDER BY a.created_at DESC LIMIT 10").all();
  const byType = db.prepare("SELECT type, COUNT(*) as count FROM incidents WHERE status='active' GROUP BY type").all();
  const bySeverity = db.prepare("SELECT severity, COUNT(*) as count FROM incidents GROUP BY severity").all();
  const rescueOps = db.prepare("SELECT r.*, i.title as incident_title, i.location FROM rescue_operations r JOIN incidents i ON r.incident_id=i.id WHERE r.status='active' ORDER BY r.created_at DESC LIMIT 10").all();
  res.render('dashboard', { stats, incidents, alerts, byType, bySeverity, rescueOps, title: 'Live Dashboard' });
});

// Map page
app.get('/map', (req, res) => {
  res.render('map', { title: 'Incident Map' });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

app.listen(PORT, () => {
  console.log(`\n🚨 Suraksha Setu running at http://localhost:${PORT}`);
  console.log(`   Admin login: admin@ndrf.gov.in / admin123`);
  console.log(`   Citizen login: rahul@citizen.in / citizen123\n`);
});
