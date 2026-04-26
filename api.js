/* ================================================================
   SecureShare — Backend / API Layer (Simulated)
   File: backend/api.js

   In a real deployment this would be Node.js / Express + Supabase.
   Here it is a pure-JS module that mimics async REST endpoints
   so the frontend can call it identically to a real API.

   Usage:
     Load this script before app.js.
     All endpoints are available on window.API.

   Real-world replacement plan:
     - Replace window.API.auth.*   → Express + Supabase Auth / Auth0
     - Replace window.API.files.*  → Express + Supabase Storage / AWS S3
     - Replace window.API.users.*  → Express + Supabase PostgreSQL
     - Replace window.API.config.* → Express + Supabase PostgreSQL
     - Replace window.API.plans.*  → Express + Stripe Billing API
   ================================================================ */

"use strict";

/* ── In-memory data store (replaces a database) ─────────────────── */
const DB = {
  users: [
    { id: 1, name: 'Layla Hassan',  email: 'layla@secureshare.io',  role: 'Admin',   status: 'active',    files: 24, joined: '2024-01-10', plan: 'pro'        },
    { id: 2, name: 'Omar Khalid',   email: 'omar@secureshare.io',   role: 'User',    status: 'active',    files: 12, joined: '2024-02-14', plan: 'starter'    },
    { id: 3, name: 'Nour El-Din',   email: 'nour@secureshare.io',   role: 'User',    status: 'suspended', files: 5,  joined: '2024-03-01', plan: 'free'       },
    { id: 4, name: 'Ahmed Tamer',   email: 'ahmed@secureshare.io',  role: 'Manager', status: 'active',    files: 38, joined: '2024-01-25', plan: 'enterprise' },
  ],

  files: [
    { id: 1, name: 'Q4_Financial_Report.pdf',   type: 'pdf', size: '4.2 MB',  owner: 'Layla Hassan', status: 'shared',  encrypted: true,  downloads: 14, expiry: '2025-12-31', uploadedAt: '2025-04-10', link: 'https://ss.io/s/7f3k91a'  },
    { id: 2, name: 'Product_Roadmap_2025.docx', type: 'doc', size: '1.8 MB',  owner: 'Ahmed Tamer',  status: 'active',  encrypted: true,  downloads: 7,  expiry: '2025-09-01', uploadedAt: '2025-04-12', link: 'https://ss.io/s/2mx4r7b'  },
    { id: 3, name: 'Team_Photo_2025.jpg',       type: 'img', size: '8.1 MB',  owner: 'Omar Khalid',  status: 'expired', encrypted: false, downloads: 32, expiry: '2025-03-01', uploadedAt: '2025-02-01', link: 'https://ss.io/s/expired'  },
    { id: 4, name: 'Source_Code_v2.zip',        type: 'zip', size: '22.5 MB', owner: 'Layla Hassan', status: 'active',  encrypted: true,  downloads: 3,  expiry: '2025-08-15', uploadedAt: '2025-04-18', link: 'https://ss.io/s/9nq2z0c'  },
    { id: 5, name: 'README.txt',                type: 'txt', size: '12 KB',   owner: 'Nour El-Din',  status: 'active',  encrypted: false, downloads: 1,  expiry: '2025-06-01', uploadedAt: '2025-04-20', link: 'https://ss.io/s/readme01' },
  ],

  configs: {
    encryption:   true,
    twoFactor:    true,
    autoExpire:   true,
    emailNotify:  false,
    logging:      true,
    backups:      true,
    rateLimiting: true,
    geoBlocking:  false,
  },

  /* Subscription plans catalog */
  plans: [
    {
      id:       'free',
      name:     'Free',
      price:    0,
      period:   '/mo',
      storage:  '5 GB',
      maxFiles: 50,
      maxUsers: 1,
      encryption: false,
      features: ['5 GB storage', '50 file limit', 'Basic sharing', '7-day link expiry'],
      missing:  ['No encryption', 'No analytics', 'No priority support'],
    },
    {
      id:       'pro',
      name:     'Pro',
      price:    19,
      period:   '/mo',
      storage:  '100 GB',
      maxFiles: 5000,
      maxUsers: 5,
      encryption: true,
      features: ['100 GB storage', 'Unlimited files', 'AES-256 encryption', 'Custom expiry dates', 'Download analytics', 'Email notifications', 'Priority support'],
      missing:  [],
    },
    {
      id:       'enterprise',
      name:     'Enterprise',
      price:    79,
      period:   '/mo',
      storage:  '2 TB',
      maxFiles: -1,
      maxUsers: -1,
      encryption: true,
      features: ['2 TB storage', 'Unlimited files & users', 'AES-256 encryption', 'SSO / SAML 2.0', 'Audit logging', 'SLA guarantee', 'Dedicated account manager', 'Custom domain'],
      missing:  [],
    },
  ],

  /* Billing history for current user */
  billing: [
    { id: 'INV-001', date: '2025-04-01', amount: '$19.00', plan: 'Pro', status: 'paid'    },
    { id: 'INV-002', date: '2025-03-01', amount: '$19.00', plan: 'Pro', status: 'paid'    },
    { id: 'INV-003', date: '2025-02-01', amount: '$19.00', plan: 'Pro', status: 'paid'    },
    { id: 'INV-004', date: '2025-01-01', amount: '$19.00', plan: 'Pro', status: 'pending' },
  ],
};

/* ── Simulated async delay (mimics network latency) ─────────────── */
function delay(ms = 200) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ================================================================
   AUTH ENDPOINTS
   ================================================================ */

/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} body
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
async function login({ email, password }) {
  await delay();
  if (!email || !password) return { ok: false, error: 'Missing credentials' };
  /* In production: verify hashed password against DB */
  const user = DB.users.find(u => u.email === email) || DB.users[0];
  return { ok: true, user: { ...user } };
}

/**
 * POST /api/auth/register
 * @param {{ name: string, email: string, password: string }} body
 * @returns {{ ok: boolean, user?: object, error?: string }}
 */
async function register({ name, email, password }) {
  await delay();
  if (!email || !password) return { ok: false, error: 'Missing fields' };
  if (DB.users.find(u => u.email === email)) return { ok: false, error: 'Email already registered' };
  const newUser = {
    id:      Date.now(),
    name:    name || 'New User',
    email,
    role:    'User',
    status:  'active',
    files:   0,
    joined:  new Date().toISOString().slice(0, 10),
    plan:    'free',
  };
  DB.users.push(newUser);
  return { ok: true, user: { ...newUser } };
}

/* ================================================================
   FILE ENDPOINTS
   ================================================================ */

/**
 * GET /api/files — list all files
 * @returns {{ ok: boolean, files: object[] }}
 */
async function getFiles() {
  await delay(100);
  return { ok: true, files: [...DB.files] };
}

/**
 * POST /api/files — upload a file record
 * @param {{ name: string, size: number|string, type?: string, encrypted: boolean, expiry: string, owner: string }} body
 * @returns {{ ok: boolean, file: object }}
 */
async function uploadFile({ name, size, type, encrypted, expiry, owner }) {
  await delay(300);
  const rec = {
    id:          Date.now(),
    name,
    type:        type || name.split('.').pop(),
    size:        typeof size === 'number' ? (size / 1048576).toFixed(1) + ' MB' : size,
    owner,
    status:      'active',
    encrypted:   !!encrypted,
    downloads:   0,
    expiry:      expiry || '2025-12-31',
    uploadedAt:  new Date().toISOString().slice(0, 10),
    link:        'https://ss.io/s/' + Math.random().toString(36).slice(2, 9),
  };
  DB.files.unshift(rec);
  return { ok: true, file: rec };
}

/**
 * DELETE /api/files/:id
 * @param {number} id
 * @returns {{ ok: boolean, error?: string }}
 */
async function deleteFile(id) {
  await delay(150);
  const idx = DB.files.findIndex(f => f.id === id);
  if (idx === -1) return { ok: false, error: 'Not found' };
  DB.files.splice(idx, 1);
  return { ok: true };
}

/**
 * POST /api/files/:id/download — increment download counter
 * @param {number} id
 * @returns {{ ok: boolean, downloads?: number, error?: string }}
 */
async function downloadFile(id) {
  await delay(400);
  const f = DB.files.find(f => f.id === id);
  if (!f) return { ok: false, error: 'Not found' };
  f.downloads++;
  return { ok: true, downloads: f.downloads };
}

/* ================================================================
   USER ENDPOINTS
   ================================================================ */

/**
 * GET /api/users
 * @returns {{ ok: boolean, users: object[] }}
 */
async function getUsers() {
  await delay(100);
  return { ok: true, users: [...DB.users] };
}

/**
 * POST /api/users
 * @param {{ name: string, email: string, role: string }} body
 * @returns {{ ok: boolean, user: object }}
 */
async function addUser({ name, email, role }) {
  await delay(200);
  const u = {
    id:      Date.now(),
    name,
    email,
    role,
    status:  'active',
    files:   0,
    joined:  new Date().toISOString().slice(0, 10),
    plan:    'free',
  };
  DB.users.push(u);
  return { ok: true, user: u };
}

/**
 * DELETE /api/users/:id
 * @param {number} id
 * @returns {{ ok: boolean }}
 */
async function deleteUser(id) {
  await delay(150);
  DB.users = DB.users.filter(u => u.id !== id);
  return { ok: true };
}

/* ================================================================
   CONFIG ENDPOINTS
   ================================================================ */

/**
 * GET /api/config
 * @returns {{ ok: boolean, configs: object }}
 */
async function getConfig() {
  await delay(50);
  return { ok: true, configs: { ...DB.configs } };
}

/**
 * PATCH /api/config
 * @param {string} key
 * @param {boolean} value
 * @returns {{ ok: boolean, configs?: object, error?: string }}
 */
async function patchConfig(key, value) {
  await delay(50);
  if (!(key in DB.configs)) return { ok: false, error: 'Unknown config key' };
  DB.configs[key] = value;
  return { ok: true, configs: { ...DB.configs } };
}

/* ================================================================
   SUBSCRIPTION ENDPOINTS
   ================================================================ */

/**
 * GET /api/plans
 * @returns {{ ok: boolean, plans: object[] }}
 */
async function getPlans() {
  await delay(80);
  return { ok: true, plans: DB.plans };
}

/**
 * POST /api/subscriptions/upgrade
 * @param {{ userId: number, planId: string }} body
 * @returns {{ ok: boolean, plan?: object, error?: string }}
 */
async function upgradePlan({ userId, planId }) {
  await delay(500);
  const user = DB.users.find(u => u.id === userId);
  if (!user) return { ok: false, error: 'User not found' };
  const plan = DB.plans.find(p => p.id === planId);
  if (!plan) return { ok: false, error: 'Plan not found' };
  user.plan = planId;
  return { ok: true, plan };
}

/**
 * GET /api/billing
 * @returns {{ ok: boolean, invoices: object[] }}
 */
async function getBilling() {
  await delay(100);
  return { ok: true, invoices: DB.billing };
}

/* ================================================================
   Export API surface — mirrors fetch() response shape
   In production each function body is replaced by a fetch() call:
     const res = await fetch('/api/files', { method:'GET', ... });
     return res.json();
   ================================================================ */
window.API = {
  auth:  { login, register },
  files: { list: getFiles, upload: uploadFile, delete: deleteFile, download: downloadFile },
  users: { list: getUsers, add: addUser, delete: deleteUser },
  config:{ get: getConfig, patch: patchConfig },
  plans: { list: getPlans, upgrade: upgradePlan, billing: getBilling },
};

console.info('[SecureShare API] Simulated backend loaded. Access via window.API');
