# 🚨 Suraksha Setu

**Centralized Emergency Response Platform**

A real-time disaster monitoring and coordination platform built for India. Citizens can report emergencies, authorities can track incidents, broadcast alerts, manage shelters, and guide people to safety — all in one place.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🗺️ **Live Incident Map** | Interactive Leaflet map showing all active incidents across India |
| 📋 **Incident Reporting** | Report floods, earthquakes, cyclones, fires with GPS location |
| 📊 **Live Dashboard** | Real-time stats, incident table, rescue operations — auto-refreshes via SSE |
| 🏠 **Shelter Finder** | Find open emergency shelters with capacity, facilities, and contact info |
| 🔔 **Emergency Alerts** | Admin can broadcast alerts; citizens see live ticker |
| 🤖 **AI Safety Guide** | Rule-based chatbot in **English & Hindi** for disaster guidance |
| 🔐 **Authentication** | Register/Login with roles (admin vs citizen) |
| 📱 **PWA** | Installable on mobile, works offline (cached assets) |

---

## 🚀 Quick Setup

### Prerequisites
- Node.js >= 18
- npm

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/Nishant07-design/disaster-response-platform.git
cd disaster-response-platform

# 2. Install dependencies
npm install

# 3. Start the server
npm start
```

Open **http://localhost:3000**

That's it. The SQLite database is created automatically with Indian demo data on first run.

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin (NDRF) | `admin@ndrf.gov.in` | `admin123` |
| Citizen | `rahul@citizen.in` | `citizen123` |

**Admin** can broadcast alerts, update incident status, and manage shelter occupancy.

---

## 📁 Project Structure

```
disaster-response-platform/
├── server.js              # Express app entry point
├── package.json
├── database/
│   └── db.js              # SQLite setup + seed data
├── routes/
│   ├── auth.js            # Login, register, logout
│   ├── incidents.js       # Report, list, view incidents
│   ├── shelters.js        # Shelter listing + occupancy
│   ├── alerts.js          # Broadcast + SSE real-time stream
│   └── ai.js              # AI chatbot endpoint
├── views/
│   ├── partials/          # Reusable navbar, head, footer
│   ├── home.ejs           # Landing page
│   ├── dashboard.ejs      # Live dashboard
│   ├── map.ejs            # Full incident map
│   ├── incidents/         # List, report form, detail
│   ├── shelters/          # Shelter list
│   ├── alerts/            # Alert list, broadcast form
│   └── ai/                # AI guide chat UI
├── public/
│   ├── css/style.css      # Custom styles
│   ├── js/app.js          # PWA + navbar JS
│   ├── sw.js              # Service Worker
│   ├── manifest.json      # PWA manifest
│   └── icons/             # App icons
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite 3 (via `better-sqlite3`) |
| Templating | EJS |
| Frontend | Bootstrap 5 + Bootstrap Icons |
| Maps | Leaflet.js + OpenStreetMap |
| Real-time | Server-Sent Events (SSE) |
| Auth | express-session + bcryptjs |
| PWA | Service Worker + Web Manifest |
| Language | English + Hindi |

---

## 🌐 Routes

| Route | Description |
|---|---|
| `GET /` | Home page |
| `GET /dashboard` | Live dashboard |
| `GET /incidents` | Incident list with filters |
| `GET /incidents/report` | Report form (auth required) |
| `GET /incidents/:id` | Incident detail |
| `GET /shelters` | Shelter list |
| `GET /map` | Interactive map |
| `GET /alerts` | Alert list |
| `GET /alerts/broadcast` | Broadcast form (admin only) |
| `GET /ai-guide` | AI safety guide |
| `GET /alerts/stream` | SSE stream for real-time updates |
| `GET /login`, `POST /login` | Authentication |
| `GET /register`, `POST /register` | Registration |
| `GET /logout` | Logout |

---

## 📱 PWA

The app is a Progressive Web App. To install:
- **Android**: Chrome → "Add to Home Screen"
- **Desktop**: Address bar → Install icon

---

## 🏗️ Development

```bash
# Auto-restart on file changes
npm run dev   # uses nodemon
```

---

## 🇮🇳 Indian Data

- Incidents across Assam, Gujarat, Uttarakhand, Maharashtra, Tamil Nadu, Delhi, MP
- Shelters in Delhi, Mumbai, Chennai, Odisha, J&K, Assam, Uttarakhand, Gujarat
- Emergency numbers: 112, NDRF, 101, 108, 1077, IMD hotline
- Indian states dropdown in all forms

---

## 📞 Emergency Contacts

| Service | Number |
|---|---|
| National Emergency | **112** |
| NDRF | **011-24363260** |
| Fire | **101** |
| Ambulance | **108** |
| Disaster Helpline | **1077** |
| IMD Weather | **1800-180-1717** |
