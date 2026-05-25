# Suraksha Setu — Detailed Study Notes

## Table of Contents
1. [Project Overview](#project-overview)
2. [Express.js — The Web Framework](#expressjs)
3. [SQLite with better-sqlite3](#sqlite)
4. [EJS Templating](#ejs)
5. [Sessions & Authentication](#sessions--auth)
6. [Real-Time with SSE](#real-time-with-sse)
7. [Leaflet Maps](#leaflet-maps)
8. [PWA — Progressive Web App](#pwa)
9. [Bootstrap 5 UI Patterns Used](#bootstrap-5)
10. [Project Architecture Decisions](#architecture)

---

## Project Overview

**Suraksha Setu** is a full-stack web app for disaster coordination. Think of it as a platform with two types of users:

- **Citizens** — report incidents (flood near my house), get safety guidance
- **Admins (NDRF)** — see everything on a live dashboard, broadcast alerts, track rescue ops

The stack is intentionally simple: no React, no TypeScript, no complex build tools. Just Node.js + EJS templates + Bootstrap.

---

## Express.js

Express is a minimal web framework for Node.js. Key concepts used:

### Routing
```js
// server.js
app.get('/dashboard', (req, res) => {
  res.render('dashboard', { data });   // render an EJS template
});

// or in a route file
const router = express.Router();
router.post('/report', requireAuth, (req, res) => { ... });
module.exports = router;

// mounted in server.js
app.use('/incidents', incidentRoutes);
```

### Middleware
Code that runs on every request before the route handler.
```js
app.use(express.json());              // parse JSON body
app.use(express.urlencoded());        // parse HTML form body
app.use(express.static('public'));    // serve static files
app.use(session({...}));             // session middleware
```

### The req/res cycle
- `req.body` — POST form data
- `req.query` — URL query params (`?type=flood`)
- `req.params` — URL params (`/incidents/:id`)
- `req.session` — session data (logged-in user)
- `res.render('template', data)` — render EJS with data
- `res.redirect('/page')` — redirect
- `res.json(data)` — send JSON (for API endpoints)

---

## SQLite

`better-sqlite3` is a fast, synchronous (no async/await needed) SQLite library.

### Why SQLite?
- Zero setup — just a `.db` file
- Perfect for small-medium apps and development
- No separate database server needed

### How we use it
```js
const Database = require('better-sqlite3');
const db = new Database('./database/disaster.db');

// Read one row
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

// Read many rows
const incidents = db.prepare('SELECT * FROM incidents WHERE status = ?').all('active');

// Write
db.prepare('INSERT INTO incidents (title, type) VALUES (?, ?)').run(title, type);

// Update
db.prepare('UPDATE incidents SET status = ? WHERE id = ?').run('resolved', id);
```

### Prepared statements
The `?` placeholders prevent SQL injection. Never use string concatenation for SQL queries.
```js
// BAD (SQL injection vulnerability!)
db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();

// GOOD
db.prepare('SELECT * FROM users WHERE email = ?').get(email);
```

### Schema (tables we created)
- **users** — id, name, email, password (hashed), role, phone, state
- **incidents** — id, title, type, description, location, lat, lng, severity, status, reported_by, affected_people
- **shelters** — id, name, address, district, state, lat, lng, capacity, current_occupancy, contact, facilities, status
- **alerts** — id, title, message, severity, type, state, active, created_by
- **rescue_operations** — id, incident_id, team_name, team_type, personnel, status

### Auto-seeding pattern
```js
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  // insert demo data only on first run
}
```

---

## EJS Templating

EJS = Embedded JavaScript. It's HTML with `<% %>` tags for logic.

```html
<!-- Variable output (escaped HTML) -->
<h1><%= title %></h1>

<!-- Unescaped HTML (use carefully) -->
<%- include('partials/navbar') %>

<!-- JavaScript logic (no output) -->
<% if (user) { %>
  <p>Welcome <%= user.name %></p>
<% } %>

<!-- Loop -->
<% incidents.forEach(inc => { %>
  <div><%= inc.title %></div>
<% }) %>
```

### Partials (reusable pieces)
```html
<!-- views/partials/navbar.ejs -->
<nav>...</nav>

<!-- Used in any view -->
<%- include('partials/navbar') %>
```

### Passing data to templates
```js
// In the route
res.render('dashboard', {
  title: 'Dashboard',
  incidents: [...],
  user: req.session.user
});
```

---

## Sessions & Auth

### How sessions work
1. User logs in → server creates a session with user data
2. Server sends a session cookie to browser
3. Browser sends cookie on every request
4. Server reads session from SQLite store using the cookie ID

```js
// Setup
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db' }),
  secret: 'secret-string',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }  // 7 days
}));

// Login
req.session.user = { id, name, email, role };
res.redirect('/dashboard');

// Logout
req.session.destroy();
res.redirect('/');

// Check auth in any route
if (!req.session.user) return res.redirect('/login');
```

### Password hashing with bcryptjs
Never store plain-text passwords!
```js
const bcrypt = require('bcryptjs');

// When registering
const hash = bcrypt.hashSync(plainPassword, 10);  // 10 = salt rounds
db.prepare('INSERT INTO users (..., password) VALUES (?, ..., ?)').run(..., hash);

// When logging in
const valid = bcrypt.compareSync(inputPassword, storedHash);
if (!valid) return res.render('login', { error: 'Invalid credentials' });
```

### Role-based access
```js
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();  // continue to the route handler
}

router.get('/broadcast', requireAdmin, (req, res) => { ... });
```

---

## Real-Time with SSE

SSE (Server-Sent Events) lets the server push data to the browser without the browser asking.

### How it works
1. Browser opens a connection to `/alerts/stream`
2. Server keeps the connection open and sends data every few seconds
3. Browser JS reads each message

```js
// Server side (route)
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = () => {
    const data = { stats: {...}, alerts: [...] };
    res.write(`data: ${JSON.stringify(data)}\n\n`);  // two newlines = end of message
  };

  send();  // send immediately
  const interval = setInterval(send, 8000);  // then every 8s

  req.on('close', () => clearInterval(interval));  // cleanup when browser disconnects
});

// Browser side (JavaScript)
const evtSrc = new EventSource('/alerts/stream');
evtSrc.onmessage = function(event) {
  const data = JSON.parse(event.data);
  document.getElementById('active-count').textContent = data.stats.activeIncidents;
};
```

**SSE vs WebSockets:** SSE is simpler, one-way (server → client only). WebSockets are two-way. For dashboards, SSE is enough.

---

## Leaflet Maps

Leaflet.js is a free, open-source map library. We use OpenStreetMap tiles (no API key needed).

```html
<!-- Load in HTML -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

<div id="map" style="height: 400px;"></div>
```

```js
// Initialize map centered on India
const map = L.map('map').setView([22.5, 82.0], 5);

// Add tile layer (the actual map images)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Add a circle marker
const marker = L.circleMarker([lat, lng], {
  radius: 10,
  fillColor: '#dc3545',
  color: '#fff',
  weight: 2,
  fillOpacity: 0.9
}).addTo(map);

// Add popup to marker
marker.bindPopup('<b>Flood in Assam</b><br>Critical severity');

// Fly to a location smoothly
map.flyTo([26.5, 93.3], 10, { duration: 0.8 });
```

### Geolocation API (browser)
```js
navigator.geolocation.getCurrentPosition(
  (position) => {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    // Use these to pre-fill form
  },
  (error) => {
    console.log('Error:', error.message);
  }
);
```

---

## PWA

A PWA (Progressive Web App) makes a website behave like a native app.

### Three things needed:
1. **HTTPS** (or localhost for dev)
2. **manifest.json** — tells browser the app name, icons, start URL
3. **Service Worker** — a background script for caching and offline support

### manifest.json
```json
{
  "name": "Suraksha Setu",
  "short_name": "Suraksha Setu",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#dc3545",
  "icons": [{ "src": "/icons/icon-192.png", "sizes": "192x192" }]
}
```

Link it in HTML: `<link rel="manifest" href="/manifest.json">`

### Service Worker (sw.js)
```js
const CACHE = 'v1';

// On install: cache static files
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/css/style.css'])));
});

// On fetch: try network, fall back to cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
```

Register in your main JS:
```js
navigator.serviceWorker.register('/sw.js');
```

---

## Bootstrap 5

Key Bootstrap patterns used in this project:

### Grid
```html
<div class="row g-3">
  <div class="col-md-6 col-lg-4">...</div>
</div>
```

### Badges (severity colours)
```html
<span class="badge bg-danger">Critical</span>
<span class="badge bg-warning text-dark">High</span>
```

### Cards
```html
<div class="card border-0 shadow-sm rounded-4">
  <div class="card-body p-4">...</div>
</div>
```

### Responsive navbar
```html
<nav class="navbar navbar-expand-lg navbar-dark bg-danger">
  <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav">
  <div class="collapse navbar-collapse" id="nav">...</div>
</nav>
```

### Progress bars
```html
<div class="progress" style="height: 8px;">
  <div class="progress-bar bg-success" style="width: 75%"></div>
</div>
```

### Accordion (used in AI Guide sidebar)
```html
<div class="accordion">
  <div class="accordion-item">
    <h2 class="accordion-header">
      <button class="accordion-button collapsed" data-bs-toggle="collapse" data-bs-target="#item1">
        Title
      </button>
    </h2>
    <div id="item1" class="accordion-collapse collapse">
      <div class="accordion-body">Content</div>
    </div>
  </div>
</div>
```

---

## Architecture

### Why server-side rendering (EJS) and not React?
- Simpler — no build step, no bundler, no npm run build
- Faster to start — open the code and it just works
- Beginner-friendly — you can see the HTML directly
- Fine for this scale (not a high-traffic SPA)

### Why SQLite and not PostgreSQL/MySQL?
- Zero setup — no install, no service running
- Everything in one file (`disaster.db`)
- `better-sqlite3` is synchronous → no async/await complexity
- Easy to reset: delete the .db file and restart

### Why SSE and not WebSockets?
- SSE is simpler to implement
- No external library needed
- Good enough for one-way dashboard updates
- WebSockets needed only if browser also needs to send data in real-time

### File organization pattern
```
routes/alerts.js      ← handles /alerts/* URLs
views/alerts/         ← templates for those pages
```
Each feature = one route file + one views folder. Very predictable.

### Seed data pattern
```js
const count = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (count.c === 0) {
  // only seed on first run
}
```
This is called "idempotent seeding" — running it many times has the same result as once.

---

## Key Files to Read First

If you want to understand this project, read in this order:

1. `server.js` — how everything connects
2. `database/db.js` — what data exists
3. `routes/incidents.js` — simplest example of full CRUD
4. `views/home.ejs` — how templates work
5. `routes/alerts.js` — how SSE works (the `/stream` endpoint)
6. `routes/ai.js` — how the AI guide works (keyword matching)
7. `public/sw.js` — how service workers work

---

## Common Gotchas

1. **EJS uses `<%=` not `{{ }}`** — common confusion if you've used Vue/Jinja
2. **`res.locals.user`** — set in middleware so all templates can access `user` without passing it in `res.render`
3. **better-sqlite3 is sync** — no `.then()`, no `await`, just direct return values
4. **SSE needs two newlines** — `res.write('data: ...\n\n')` — the double newline marks end of event
5. **Service worker scope** — `sw.js` must be at root `/sw.js` to control all pages
6. **PWA requires HTTPS in production** — localhost works for dev
