# 🔐 SecureShare — Secure File Sharing System

![SecureShare Banner](https://img.shields.io/badge/SecureShare-v2.4.1-1a6cf6?style=for-the-badge&logo=shield&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-10d48e?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)

A full-featured, browser-based secure file sharing platform with AES-256 encryption simulation, user management, analytics dashboards, subscription billing, and sprint/requirements tracking — all running client-side with a simulated REST API backend.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 AES-256 Encryption | End-to-end encryption badge & policy enforcement per file |
| 📁 File Manager | Upload, share, delete, download with status & expiry tracking |
| 👥 User Management | Add/remove users, assign roles (Admin / Manager / User) |
| 📊 Analytics Dashboard | Burn-down chart, velocity chart, KPI cards, storage trends |
| 🗺️ Requirements Map | Sprint monitoring with 12 tracked requirements |
| ⚙️ Configuration Panel | Toggle security settings, manage system config, version history |
| 💳 Subscription & Billing | Free / Pro / Enterprise plan cards, usage meters, invoice history |
| 🎨 Animated Background | Particle canvas with grid, glow orbs, and connection lines |

---

## 🗂️ Project Structure

```
secureshare/
├── index.html                  # Bundled single-file version (for quick preview)
├── README.md                   # This file
├── .gitignore                  # Git ignore rules
├── LICENSE                     # MIT License
├── frontend/
│   ├── css/
│   │   └── styles.css          # All application styles
│   └── js/
│       ├── icons-bg.js         # SVG icon library + particle background animation
│       └── app.js              # Main application logic & page renderers
├── backend/
│   └── api.js                  # Simulated async REST API (replaces Node/Express)
└── diagrams/
    └── architecture.html       # System architecture diagram
```

---

## 🚀 Getting Started

### Option 1 — Single File (Quickest)
Just open `index.html` in any modern browser. No build step, no server needed.

```bash
git clone https://github.com/YOUR_USERNAME/secureshare.git
cd secureshare
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

### Option 2 — Serve Locally (Recommended)
Use any static file server to avoid CORS quirks:

```bash
# Python
python3 -m http.server 3000

# Node.js (npx)
npx serve .

# VS Code
# Install "Live Server" extension and click "Go Live"
```

Then visit: `http://localhost:3000`

---

## 🔑 Demo Credentials

| Field | Value |
|---|---|
| Email | `admin@secureshare.io` (pre-filled) |
| Password | `password` (pre-filled) |

Any email/password combination works — the backend is simulated in-memory.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| UI Framework | Vanilla JavaScript (no framework dependencies) |
| Charts | [Chart.js 4.4.1](https://www.chartjs.org/) via cdnjs CDN |
| Fonts | [Plus Jakarta Sans + JetBrains Mono](https://fonts.google.com/) via Google Fonts |
| Backend | Simulated async REST API (`window.API`) — pure JS, no server required |
| Styling | Custom CSS with CSS variables, no preprocessor |
| Canvas | Native HTML5 Canvas API for particle background |

---

## 📡 API Reference (Simulated)

All endpoints are async functions exposed on `window.API`. They behave identically to real REST endpoints.

```js
// Auth
await API.auth.login({ email, password })
await API.auth.register({ name, email, password })

// Files
await API.files.list()
await API.files.upload({ name, size, encrypted, expiry, owner })
await API.files.delete(id)
await API.files.download(id)

// Users
await API.users.list()
await API.users.add({ name, email, role })
await API.users.delete(id)

// Config
await API.config.get()
await API.config.patch(key, value)

// Subscription & Billing
await API.plans.list()
await API.plans.upgrade({ userId, planId })
await API.plans.billing()
```

---

## 🏗️ Architecture

See [`diagrams/architecture.html`](diagrams/architecture.html) for the full interactive system architecture diagram.

**High-level overview:**

```
Browser (Client)
├── frontend/js/app.js          → Page rendering & state management
├── frontend/js/icons-bg.js     → SVG icons & canvas animation
├── frontend/css/styles.css     → Global styles & theme
└── backend/api.js              → Simulated API layer (in-memory DB)
```

In a production deployment, `backend/api.js` would be replaced by a real **Node.js + Express** server connected to **Supabase** (PostgreSQL) with actual AES-256 encryption via the Web Crypto API.

---

## 🛡️ Security Notes

This is a **demonstration/prototype** application. The following are simulated:
- AES-256 encryption (badges are shown but no real encryption occurs in the browser)
- Authentication (any credentials are accepted)
- File storage (files are stored in memory, not on disk)
- Billing (no real payment processing)

For a production deployment, integrate:
- **Web Crypto API** for real AES-256-GCM encryption
- **Supabase Auth** or **Auth0** for authentication
- **Supabase Storage** or **AWS S3** for file storage
- **Stripe** for billing

---

## 🗺️ Requirements Status

| ID | Requirement | Progress |
|---|---|---|
| REQ-001 | User Authentication | ✅ 100% |
| REQ-002 | AES-256 File Encryption | ✅ 100% |
| REQ-003 | File Upload/Download | ✅ 100% |
| REQ-004 | Access Control | 🟡 85% |
| REQ-005 | Expiring Share Links | 🟡 90% |
| REQ-006 | Admin Dashboard | 🟡 75% |
| REQ-007 | Two-Factor Authentication | 🟡 60% |
| REQ-008 | Audit Logging | 🟡 40% |
| REQ-009 | API Rate Limiting | 🔴 30% |
| REQ-010 | Mobile Responsive UI | 🟡 70% |
| REQ-011 | Backup & Recovery | 🔴 20% |
| REQ-012 | Analytics & Reporting | 🟡 50% |

---

## 📄 License

MIT © 2025 — See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request
