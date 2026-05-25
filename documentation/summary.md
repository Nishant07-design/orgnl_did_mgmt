# Suraksha Setu — Quick Summary

> Skim this first. Read `detailed_notes.md` to go deep.

---

## What is this project?

A **web app** for disaster management in India. Citizens report floods, earthquakes, fires etc. Authorities see them on a live dashboard and coordinate rescue.

---

## Tech Stack (one-liner each)

| What | What it does |
|---|---|
| **Node.js** | Runs the server (JavaScript on the backend) |
| **Express** | Web framework — handles routes like `/dashboard`, `/login` |
| **SQLite3** | Simple file-based database — no setup needed |
| **EJS** | HTML templates with JavaScript logic inside `<% %>` tags |
| **Bootstrap 5** | CSS framework for clean responsive UI out of the box |
| **Leaflet.js** | Shows interactive maps (like Google Maps but free + open) |
| **SSE** | Server-Sent Events — server pushes live data to browser |
| **bcryptjs** | Hashes passwords before saving them to DB |
| **PWA** | Makes the website installable like an app on phones |

---

## Key Concepts (10 bullets)

1. **MVC pattern** — Models (db.js), Views (EJS files), Controllers (route files)
2. **Express Router** — Each feature has its own `routes/*.js` file
3. **Sessions** — User login is remembered using `express-session` + SQLite store
4. **Seeding** — On first start, `db.js` auto-fills demo data (incidents, shelters, alerts)
5. **SSE** — `/alerts/stream` endpoint sends JSON every 8s; dashboard JS reads it
6. **Geolocation API** — Browser API to get user's GPS coordinates for incident reporting
7. **Leaflet** — CDN-loaded map library; markers are added with `L.circleMarker()`
8. **PWA** — `manifest.json` + `sw.js` (service worker) makes it installable + offline-capable
9. **Role-based auth** — `role` field in DB; only `admin` can broadcast alerts or update status
10. **Hindi/English AI** — Keyword matching in `/ai-guide/ask` route returns pre-written responses

---

## Folder structure (simplified)

```
server.js          ← start here, the main file
routes/            ← one file per feature
views/             ← HTML templates (.ejs files)
public/            ← CSS, JS, icons (sent to browser)
database/          ← db.js (setup + seed) + .db file
```

---

## How to run

```bash
npm install
npm start
# open http://localhost:3000
```

Login: `admin@ndrf.gov.in` / `admin123`
