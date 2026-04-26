/* ================================================================
   SecureShare — Main Application Logic
   File: frontend/js/app.js

   Depends on:
     - frontend/js/icons-bg.js   (window.ICONS)
     - backend/api.js            (window.API)
   ================================================================ */

"use strict";

/* ── Application State ─────────────────────────────────────────── */
const store = {
  user:           null,
  page:           'auth',
  authMode:       'login',     // 'login' | 'register' | 'subscribe'
  files:          [],
  users:          [],
  configs:        {},
  modal:          null,
  searchQ:        '',
  uploading:      false,
  uploadProgress: 0,
  selectedPlan:   null,
};

/* ── Root element ──────────────────────────────────────────────── */
const app = document.getElementById('app');

/* ================================================================
   UTILITY
   ================================================================ */
function notify(msg, type = 'success') {
  const n = document.createElement('div');
  n.className = 'notif';
  n.innerHTML = `${ICONS[type === 'success' ? 'check' : 'warning']}<span>${msg}</span>`;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 3000);
}

function render() {
  if (!store.user) { renderAuth(); return; }
  renderApp();
}

/* ================================================================
   PAGE: AUTHENTICATION
   ================================================================ */
function renderAuth() {
  const isLogin = store.authMode === 'login';
  const isReg   = store.authMode === 'register';

  app.innerHTML = `
  <div class="auth-screen">
    <div class="auth-card">
      <div class="auth-logo">
        <div class="logo-icon">${ICONS.shield}</div>
        <span>Secure<em>Share</em></span>
      </div>

      <div class="auth-tabs">
        <div class="auth-tab ${isLogin ? 'active' : ''}" data-mode="login">Sign In</div>
        <div class="auth-tab ${isReg   ? 'active' : ''}" data-mode="register">Register</div>
        <div class="auth-tab ${store.authMode === 'subscribe' ? 'active' : ''}" data-mode="subscribe">Plans</div>
      </div>

      ${isLogin || isReg ? `
        <h1 class="auth-title">${isLogin ? 'Welcome back' : 'Create account'}</h1>
        <p class="auth-sub">${isLogin ? 'Sign in to your secure workspace' : 'Join the secure file sharing platform'}</p>

        ${isReg ? `<div class="form-group"><label class="form-label">Full Name</label><input class="form-input" type="text" id="auth-name" placeholder="Your Name"/></div>` : ''}

        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" id="auth-email" placeholder="you@example.com" value="${isLogin ? 'admin@secureshare.io' : ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" id="auth-pass" placeholder="••••••••" value="${isLogin ? 'password' : ''}"/>
        </div>
        <button class="btn-primary" id="auth-btn">${isLogin ? 'Sign In Securely' : 'Create Account'}</button>
        <div style="margin-top:1.5rem;padding:1rem;background:rgba(26,108,246,.08);border:1px solid rgba(26,108,246,.2);border-radius:10px;font-size:12px;color:var(--white60);text-align:center">
          AES-256 encrypted · Zero-knowledge architecture
        </div>
      ` : renderAuthPlans()}
    </div>
  </div>`;

  document.querySelectorAll('.auth-tab').forEach(t => {
    t.onclick = () => { store.authMode = t.dataset.mode; render(); };
  });
  document.getElementById('auth-btn')?.addEventListener('click', doAuth);
  document.querySelectorAll('.auth-plan-btn').forEach(b => {
    b.onclick = () => { store.selectedPlan = b.dataset.plan; store.authMode = 'register'; render(); };
  });
}

/* Inline plan cards shown in auth screen */
function renderAuthPlans() {
  const plans = [
    { id: 'free',       name: 'Free',       price: '$0',  badge: 'Get started', color: 'var(--white60)' },
    { id: 'pro',        name: 'Pro',        price: '$19', badge: 'Most popular', color: 'var(--blue3)'  },
    { id: 'enterprise', name: 'Enterprise', price: '$79', badge: 'For teams',    color: 'var(--cyan)'   },
  ];
  return `
  <h1 class="auth-title" style="margin-bottom:.5rem">Choose a Plan</h1>
  <p class="auth-sub" style="margin-bottom:1.5rem">Select the plan that fits your needs</p>
  <div style="display:flex;flex-direction:column;gap:.75rem">
    ${plans.map(p => `
    <div style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;justify-content:space-between;gap:1rem">
      <div>
        <div style="font-size:15px;font-weight:700;color:${p.color}">${p.name}</div>
        <div style="font-size:11px;color:var(--white40)">${p.badge}</div>
      </div>
      <div style="font-size:22px;font-weight:800;font-variant-numeric:tabular-nums">${p.price}<span style="font-size:12px;font-weight:400;color:var(--white60)">/mo</span></div>
      <button class="btn btn-blue btn-sm auth-plan-btn" data-plan="${p.id}">Select</button>
    </div>`).join('')}
  </div>
  <div style="margin-top:1.25rem;text-align:center;font-size:13px;color:var(--white60)">
    Already have an account? <a style="color:var(--cyan);cursor:pointer" onclick="store.authMode='login';render()">Sign in</a>
  </div>`;
}

async function doAuth() {
  const email = document.getElementById('auth-email')?.value || '';
  const pass  = document.getElementById('auth-pass')?.value  || '';
  const name  = document.getElementById('auth-name')?.value  || '';

  const btn = document.getElementById('auth-btn');
  if (btn) { btn.textContent = 'Authenticating…'; btn.disabled = true; }

  let result;
  if (store.authMode === 'register') {
    result = await API.auth.register({ name, email, password: pass });
  } else {
    result = await API.auth.login({ email, password: pass });
  }

  if (!result.ok) {
    notify(result.error || 'Auth failed', 'warning');
    if (btn) { btn.textContent = 'Retry'; btn.disabled = false; }
    return;
  }

  store.user = result.user;
  store.page = 'dashboard';

  /* Bootstrap data from API */
  const [fu, cu] = await Promise.all([API.files.list(), API.config.get()]);
  store.files   = fu.files;
  store.configs = cu.configs;
  store.users   = (await API.users.list()).users;

  render();
  notify('Welcome, ' + store.user.name + '!');
}

/* ================================================================
   APP SHELL — Sidebar + Router
   ================================================================ */
function renderApp() {
  app.innerHTML = `
  <nav class="sidebar">
    <div class="sidebar-logo">
      <div class="s-logo-icon">${ICONS.shield}</div>
      <span>Secure<em>Share</em></span>
    </div>
    <div class="sidebar-nav">
      <div class="nav-section">Main</div>
      ${navItem('dashboard',    'home',     'Dashboard')}
      ${navItem('files',        'file',     'My Files', String(store.files.length))}
      ${navItem('upload',       'upload',   'Upload File')}
      <div class="nav-section">Management</div>
      ${navItem('admin',        'users',    'User Management')}
      ${navItem('config',       'settings', 'Configuration')}
      ${navItem('requirements', 'map',      'Requirements Map')}
      <div class="nav-section">Analytics & Billing</div>
      ${navItem('analytics',    'activity', 'KPIs & Analytics')}
      ${navItem('subscription', 'star',     'Subscription')}
    </div>
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="user-avatar">${store.user.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
        <div class="user-info">
          <div class="user-name">${store.user.name}</div>
          <div class="user-role"><span class="online-dot"></span>${store.user.role}</div>
        </div>
        <div class="logout-btn" id="logout-btn" title="Sign out">${ICONS.logout}</div>
      </div>
    </div>
  </nav>
  <main class="main" id="main-content"></main>
  ${store.modal ? buildModal() : ''}`;

  document.getElementById('logout-btn').onclick = () => {
    store.user = null; store.page = 'auth'; render();
  };
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => { store.page = el.dataset.page; render(); };
  });

  const mc = document.getElementById('main-content');
  const pages = {
    dashboard:    renderDashboard,
    files:        renderFiles,
    upload:       renderUpload,
    admin:        renderAdmin,
    config:       renderConfig,
    requirements: renderRequirements,
    analytics:    renderAnalytics,
    subscription: renderSubscription,
  };
  (pages[store.page] || renderDashboard)(mc);

  if (store.modal) wireModal();
}

function navItem(page, icon, label, badge = '') {
  return `<div class="nav-item ${store.page === page ? 'active' : ''}" data-page="${page}">
    ${ICONS[icon]}<span>${label}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ''}
  </div>`;
}

/* ================================================================
   PAGE: DASHBOARD
   ================================================================ */
function renderDashboard(el) {
  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Dashboard</div>
      <div class="page-sub">Secure File Sharing System — Live Overview</div>
    </div>
    <div class="header-actions">
      <span class="enc-badge">${ICONS.lock} AES-256 Active</span>
      <button class="btn btn-blue" id="go-upload">${ICONS.upload} Upload File</button>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card blue">
      <div class="kpi-icon">${ICONS.file}</div>
      <div class="kpi-label">Total Files</div>
      <div class="kpi-value">2,481</div>
      <div class="kpi-change up">▲ 12.4% this month</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-icon">${ICONS.users}</div>
      <div class="kpi-label">Active Users</div>
      <div class="kpi-value">348</div>
      <div class="kpi-change up">▲ 8.1% this week</div>
    </div>
    <div class="kpi-card yellow">
      <div class="kpi-icon">${ICONS.activity}</div>
      <div class="kpi-label">Storage Used</div>
      <div class="kpi-value">84.2 GB</div>
      <div class="kpi-change up">▲ 3.8 GB this week</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-icon">${ICONS.download}</div>
      <div class="kpi-label">Downloads Today</div>
      <div class="kpi-value">1,039</div>
      <div class="kpi-change down">▼ 2.1% vs yesterday</div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-card wide">
      <div class="chart-title">File Upload Activity <span class="chart-sub">Last 30 days</span></div>
      <div class="chart-wrap"><canvas id="c-activity"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Storage by Type <span class="chart-sub">Current breakdown</span></div>
      <div class="chart-wrap"><canvas id="c-storage"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Security Events <span class="chart-sub">This week</span></div>
      <div class="chart-wrap"><canvas id="c-security"></canvas></div>
    </div>
  </div>

  <div class="table-card">
    <div class="table-header">
      <div class="table-title">Recent Files</div>
      <button class="btn btn-ghost btn-sm" id="goto-files">${ICONS.file} View All Files</button>
    </div>
    <table>
      <thead><tr><th>File</th><th>Owner</th><th>Status</th><th>Encrypted</th><th>Downloads</th><th>Expiry</th><th>Actions</th></tr></thead>
      <tbody>${store.files.slice(0, 4).map(fileRow).join('')}</tbody>
    </table>
  </div>`;

  document.getElementById('go-upload').onclick = () => { store.page = 'upload'; render(); };
  document.getElementById('goto-files').onclick = () => { store.page = 'files'; render(); };
  wireFileActions();
  initDashboardCharts();
}

function initDashboardCharts() {
  setTimeout(() => {
    const lbl = [], uploads = [], downloads = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      lbl.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      uploads.push(Math.floor(Math.random() * 80 + 20));
      downloads.push(Math.floor(Math.random() * 120 + 40));
    }
    new Chart(document.getElementById('c-activity'), {
      type: 'line',
      data: { labels: lbl, datasets: [
        { label: 'Uploads',   data: uploads,   borderColor: '#1a6cf6', backgroundColor: 'rgba(26,108,246,0.1)', tension: .4, fill: true, pointRadius: 0, pointHoverRadius: 4 },
        { label: 'Downloads', data: downloads, borderColor: '#00c6ff', backgroundColor: 'rgba(0,198,255,0.06)', tension: .4, fill: true, pointRadius: 0, pointHoverRadius: 4 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', maxRotation: 0, maxTicksLimit: 7, font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
    new Chart(document.getElementById('c-storage'), {
      type: 'doughnut',
      data: { labels: ['Documents', 'Images', 'Videos', 'Archives', 'Other'], datasets: [{ data: [38, 24, 18, 12, 8], backgroundColor: ['#1a6cf6', '#10d48e', '#f59e0b', '#f43f5e', '#8b5cf6'], borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: 'rgba(255,255,255,.7)', padding: 12, font: { size: 11 }, boxWidth: 10 } } } },
    });
    new Chart(document.getElementById('c-security'), {
      type: 'bar',
      data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [
        { label: 'Blocked',  data: [12, 8, 15, 6, 20, 3, 9],  backgroundColor: 'rgba(244,63,94,0.7)',  borderRadius: 4 },
        { label: 'Warnings', data: [5, 12, 8, 14, 7, 2, 11],  backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'rgba(255,255,255,.6)', font: { size: 11 }, boxWidth: 10 } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
  }, 100);
}

/* ================================================================
   PAGE: FILE MANAGER
   ================================================================ */
function renderFiles(el) {
  const q = store.searchQ.toLowerCase();
  const filtered = store.files.filter(f => f.name.toLowerCase().includes(q) || f.owner.toLowerCase().includes(q));
  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">My Files</div>
      <div class="page-sub">${store.files.length} files · ${store.files.filter(f => f.encrypted).length} encrypted</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-blue" id="go-upload">${ICONS.upload} Upload New</button>
    </div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">All Files</div>
      <div style="display:flex;gap:.75rem;align-items:center">
        <input class="search-input" placeholder="Search files…" id="file-search" value="${store.searchQ}"/>
        <select id="status-filter"><option value="">All Status</option><option>active</option><option>shared</option><option>expired</option></select>
      </div>
    </div>
    <table>
      <thead><tr><th>File</th><th>Owner</th><th>Status</th><th>Encrypted</th><th>Downloads</th><th>Expiry</th><th>Actions</th></tr></thead>
      <tbody>${filtered.map(fileRow).join('')}</tbody>
    </table>
    ${filtered.length === 0 ? `<div style="padding:3rem;text-align:center;color:var(--white40)">No files match your search</div>` : ''}
  </div>`;

  document.getElementById('go-upload').onclick = () => { store.page = 'upload'; render(); };
  document.getElementById('file-search').oninput = e => { store.searchQ = e.target.value; renderFiles(el); };
  wireFileActions();
}

function fileRow(f) {
  const tc = { pdf: 'pdf', docx: 'doc', doc: 'doc', jpg: 'img', jpeg: 'img', png: 'img', zip: 'zip', txt: 'txt' }[f.type] || 'txt';
  return `<tr>
    <td><div class="file-name">
      <div class="file-icon ${tc}">${f.type.toUpperCase()}</div>
      <div><div class="fname">${f.name}</div><div class="fsize">${f.size}</div></div>
    </div></td>
    <td style="color:var(--white80)">${f.owner}</td>
    <td><span class="badge ${f.status}">${f.status}</span></td>
    <td>${f.encrypted ? `<span class="enc-badge">${ICONS.lock} AES-256</span>` : `<span style="color:var(--white40);font-size:12px">None</span>`}</td>
    <td style="font-family:var(--mono);font-size:13px">${f.downloads}</td>
    <td><span class="expiry">${f.expiry}</span></td>
    <td><div class="action-btns">
      <button class="btn btn-ghost btn-sm file-action" data-action="share"  data-id="${f.id}" title="Share">${ICONS.link}</button>
      <button class="btn btn-ghost btn-sm file-action" data-action="view"   data-id="${f.id}" title="Download">${ICONS.download}</button>
      <button class="btn btn-danger btn-sm file-action" data-action="delete" data-id="${f.id}" title="Delete">${ICONS.trash}</button>
    </div></td>
  </tr>`;
}

function wireFileActions() {
  document.querySelectorAll('.file-action').forEach(btn => {
    btn.onclick = async () => {
      const id     = +btn.dataset.id;
      const action = btn.dataset.action;
      const file   = store.files.find(f => f.id === id);
      if (action === 'delete') {
        if (!confirm('Delete ' + file.name + '?')) return;
        await API.files.delete(id);
        store.files = store.files.filter(f => f.id !== id);
        notify('File deleted'); render();
      } else if (action === 'share') {
        store.modal = { type: 'share', file }; render();
      } else if (action === 'view') {
        notify('Downloading ' + file.name + '…');
        const res = await API.files.download(id);
        if (res.ok) { file.downloads = res.downloads; }
        notify(file.name + ' downloaded');
        render();
      }
    };
  });
}

/* ================================================================
   PAGE: UPLOAD
   ================================================================ */
function renderUpload(el) {
  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Upload File</div>
      <div class="page-sub">Files are encrypted with AES-256 before storage</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 380px;gap:1.5rem">
    <div>
      <div class="table-card" style="padding:1.5rem;margin-bottom:1.25rem">
        <div class="config-section-title">${ICONS.upload} Drop Zone</div>
        <div class="upload-zone" id="upload-zone">
          <input class="upload-input" type="file" id="file-input" multiple/>
          <div class="upload-icon">${ICONS.upload}</div>
          <div class="upload-title">Drag &amp; Drop Files Here</div>
          <div class="upload-desc">or click to browse · Max 100MB per file</div>
          <div style="margin-top:1rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap">
            ${['PDF', 'DOCX', 'XLSX', 'JPG', 'PNG', 'ZIP', 'MP4'].map(t =>
              `<span style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:3px 10px;font-size:11px;color:var(--white60)">${t}</span>`
            ).join('')}
          </div>
        </div>
        ${store.uploading ? `
        <div style="margin-top:1.25rem">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:.5rem">
            <span>Uploading &amp; encrypting…</span>
            <span style="color:var(--blue3)">${Math.round(store.uploadProgress)}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${store.uploadProgress}%"></div></div>
        </div>` : ''}
      </div>
      <div class="table-card" style="padding:1.5rem">
        <div class="config-section-title">${ICONS.settings} Upload Settings</div>
        <div class="config-row">
          <div><div class="config-key">Enable Encryption</div><div class="config-desc">AES-256 end-to-end encryption</div></div>
          <div class="toggle on" id="enc-toggle"></div>
        </div>
        <div class="config-row">
          <div><div class="config-key">Set Expiry Date</div></div>
          <input class="form-input" type="date" id="expiry-date" style="width:180px" value="2025-12-31"/>
        </div>
        <div class="config-row">
          <div><div class="config-key">Access Control</div></div>
          <select><option>Private</option><option>Link Only</option><option>Specific Users</option><option>Public</option></select>
        </div>
        <div class="config-row">
          <div><div class="config-key">Max Downloads</div></div>
          <input class="form-input" type="number" placeholder="Unlimited" style="width:140px" min="1"/>
        </div>
      </div>
    </div>
    <div>
      <div class="table-card" style="padding:1.5rem;margin-bottom:1.25rem">
        <div class="config-section-title">${ICONS.lock} Security Info</div>
        <div style="display:flex;flex-direction:column;gap:.75rem;font-size:13px">
          ${[['AES-256 Encryption', 'Files encrypted at rest & in transit'], ['Zero-Knowledge', 'Server cannot read your files'], ['Secure Links', 'Time-limited access tokens'], ['Audit Log', 'All access events logged']]
            .map(([t, d]) => `<div style="display:flex;gap:.75rem;align-items:flex-start;padding:.75rem;background:var(--card2);border-radius:10px;border:1px solid var(--border)">
              <div style="color:var(--success);margin-top:2px">${ICONS.check}</div>
              <div><div style="font-weight:600;margin-bottom:2px">${t}</div><div style="color:var(--white60);font-size:12px">${d}</div></div>
            </div>`).join('')}
        </div>
      </div>
      <div class="table-card" style="padding:1.5rem">
        <div class="config-section-title">${ICONS.activity} Recent Uploads</div>
        ${store.files.slice(0, 3).map(f => `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.6rem 0;border-bottom:1px solid rgba(255,255,255,.05)">
          <div class="file-icon ${{ pdf: 'pdf', doc: 'doc', img: 'img', zip: 'zip' }[f.type] || 'txt'}" style="width:28px;height:28px;font-size:9px">${f.type.toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
            <div style="font-size:11px;color:var(--white40)">${f.size}</div>
          </div>
          ${f.encrypted ? `<span class="enc-badge" style="font-size:10px;padding:2px 7px">${ICONS.lock}</span>` : ''}
        </div>`).join('')}
      </div>
    </div>
  </div>`;

  const zone = document.getElementById('upload-zone');
  zone.ondragover  = e => { e.preventDefault(); zone.classList.add('drag'); };
  zone.ondragleave = () => zone.classList.remove('drag');
  zone.ondrop      = e => { e.preventDefault(); zone.classList.remove('drag'); handleUpload(e.dataTransfer.files[0]); };
  document.getElementById('file-input').onchange = e => handleUpload(e.target.files[0]);
  document.getElementById('enc-toggle').onclick  = e => e.currentTarget.classList.toggle('on');
}

async function handleUpload(file) {
  if (!file) return;
  store.uploading = true; store.uploadProgress = 0; render();
  let p = 0;
  const iv = setInterval(async () => {
    p += Math.random() * 8 + 3;
    if (p >= 100) {
      clearInterval(iv);
      store.uploading = false;
      const expiry = document.getElementById('expiry-date')?.value || '2025-12-31';
      const res = await API.files.upload({ name: file.name, size: file.size, encrypted: true, expiry, owner: store.user.name });
      if (res.ok) store.files = (await API.files.list()).files;
      notify('✓ ' + file.name + ' uploaded & encrypted');
      store.page = 'files'; render(); return;
    }
    store.uploadProgress = Math.min(p, 99);
    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = store.uploadProgress + '%';
  }, 80);
}

/* ================================================================
   PAGE: USER MANAGEMENT
   ================================================================ */
function renderAdmin(el) {
  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">User Management</div>
      <div class="page-sub">Manage users, roles, and access permissions</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-blue" id="add-user">${ICONS.plus} Add User</button>
    </div>
  </div>
  <div class="admin-stats">
    <div class="stat-card"><div class="stat-icon blue">${ICONS.users}</div><div><div class="stat-num">${store.users.length}</div><div class="stat-lbl">Total Users</div></div></div>
    <div class="stat-card"><div class="stat-icon green">${ICONS.check}</div><div><div class="stat-num">${store.users.filter(u => u.status === 'active').length}</div><div class="stat-lbl">Active</div></div></div>
    <div class="stat-card"><div class="stat-icon orange">${ICONS.warning}</div><div><div class="stat-num">${store.users.filter(u => u.status === 'suspended').length}</div><div class="stat-lbl">Suspended</div></div></div>
  </div>
  <div class="table-card">
    <div class="table-header">
      <div class="table-title">All Users</div>
      <input class="search-input" placeholder="Search users…" id="user-search"/>
    </div>
    <table>
      <thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Files</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>
        ${store.users.map(u => `<tr>
          <td><div style="display:flex;align-items:center;gap:.75rem">
            <div class="user-avatar" style="width:36px;height:36px;font-size:13px">${u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
            <div><div style="font-weight:500">${u.name}</div><div style="font-size:12px;color:var(--white40)">${u.email}</div></div>
          </div></td>
          <td><span class="badge ${u.role === 'Admin' ? 'shared' : u.role === 'Manager' ? 'pending' : 'active'}">${u.role}</span></td>
          <td><span class="badge ${u.plan === 'enterprise' ? 'encrypted' : u.plan === 'pro' ? 'shared' : 'active'}" style="text-transform:capitalize">${u.plan || 'free'}</span></td>
          <td style="font-family:var(--mono)">${u.files}</td>
          <td><span class="badge ${u.status === 'active' ? 'active' : 'expired'}">${u.status}</span></td>
          <td style="font-size:12px;color:var(--white60)">${u.joined}</td>
          <td><div class="action-btns">
            <button class="btn btn-ghost btn-sm user-edit" data-id="${u.id}">${ICONS.eye} Edit</button>
            <button class="btn btn-danger btn-sm user-del" data-id="${u.id}" ${u.id === 1 ? 'disabled' : ''} title="Delete">${ICONS.trash}</button>
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;

  document.getElementById('add-user').onclick = () => { store.modal = { type: 'adduser' }; render(); };
  document.querySelectorAll('.user-del').forEach(b => {
    b.onclick = async () => {
      const id = +b.dataset.id;
      if (!confirm('Remove user?')) return;
      await API.users.delete(id);
      store.users = store.users.filter(u => u.id !== id);
      notify('User removed'); render();
    };
  });
  document.getElementById('user-search').oninput = e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('tbody tr').forEach(r => {
      r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}

/* ================================================================
   PAGE: CONFIGURATION
   ================================================================ */
function renderConfig(el) {
  const versions = [
    { v: 'v2.4.1', current: true,  date: '2025-04-20', changes: 'AES-256 upgrade, rate limiting improvements' },
    { v: 'v2.3.0', current: false, date: '2025-03-15', changes: 'Two-factor auth, expiring link UI' },
    { v: 'v2.2.1', current: false, date: '2025-02-01', changes: 'Bug fixes, performance optimizations' },
    { v: 'v2.1.0', current: false, date: '2025-01-10', changes: 'File versioning, admin dashboard' },
    { v: 'v2.0.0', current: false, date: '2024-12-01', changes: 'Full rewrite, Supabase migration' },
  ];
  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Configuration &amp; Version Control</div>
      <div class="page-sub">System settings, security policies, and release history</div>
    </div>
    <div class="header-actions">
      <button class="btn btn-blue" onclick="notify('Settings saved!')">${ICONS.check} Save Changes</button>
    </div>
  </div>
  <div class="config-grid">
    <div style="display:flex;flex-direction:column;gap:1.25rem">
      <div class="config-card">
        <div class="config-section-title">${ICONS.lock} Security Settings</div>
        ${Object.entries({ encryption: 'End-to-End Encryption', twoFactor: 'Two-Factor Authentication', autoExpire: 'Auto-Expire Shared Links', rateLimiting: 'API Rate Limiting', geoBlocking: 'Geo-Blocking' })
          .map(([k, v]) => `<div class="config-row"><div><div class="config-key">${v}</div></div><div class="toggle ${store.configs[k] ? 'on' : ''}" data-cfg="${k}"></div></div>`).join('')}
      </div>
      <div class="config-card">
        <div class="config-section-title">${ICONS.settings} System Settings</div>
        ${Object.entries({ emailNotify: 'Email Notifications', logging: 'Audit Logging', backups: 'Automatic Backups' })
          .map(([k, v]) => `<div class="config-row"><div><div class="config-key">${v}</div></div><div class="toggle ${store.configs[k] ? 'on' : ''}" data-cfg="${k}"></div></div>`).join('')}
        <div class="config-row"><div><div class="config-key">Max File Size</div></div><select><option>50 MB</option><option selected>100 MB</option><option>500 MB</option><option>1 GB</option></select></div>
        <div class="config-row"><div><div class="config-key">Default Link Expiry</div></div><select><option>24 hours</option><option>7 days</option><option selected>30 days</option><option>90 days</option></select></div>
        <div class="config-row"><div><div class="config-key">Encryption Algorithm</div></div><select><option selected>AES-256-GCM</option><option>AES-128-GCM</option><option>ChaCha20</option></select></div>
      </div>
    </div>
    <div>
      <div class="config-card">
        <div class="config-section-title">${ICONS.git} Version Control History</div>
        <div class="version-timeline">
          ${versions.map(ver => `<div class="version-item">
            <div class="v-dot ${ver.current ? 'current' : ''}"></div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:2px">
                <div class="v-label">${ver.v}</div>
                ${ver.current ? `<span class="badge active">Current</span>` : ''}
              </div>
              <div class="v-date">${ver.date}</div>
              <div class="v-changes">${ver.changes}</div>
              ${!ver.current ? `<button class="btn btn-ghost btn-sm" style="margin-top:.5rem" onclick="notify('Rolling back to ${ver.v}…')">Rollback</button>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>
      <div class="config-card" style="margin-top:1.25rem">
        <div class="config-section-title">${ICONS.shield} System Status</div>
        ${[['API Gateway', 'Operational'], ['Encryption Service', 'Operational'], ['File Storage', 'Operational'], ['Auth Service', 'Operational'], ['Backup System', 'Scheduled']]
          .map(([s, st]) => `<div class="config-row"><div class="config-key">${s}</div><span class="badge ${st === 'Operational' ? 'active' : 'pending'}">${st}</span></div>`).join('')}
      </div>
    </div>
  </div>`;

  document.querySelectorAll('.toggle[data-cfg]').forEach(t => {
    t.onclick = async () => {
      const k = t.dataset.cfg;
      const newVal = !store.configs[k];
      await API.config.patch(k, newVal);
      store.configs[k] = newVal;
      t.classList.toggle('on', newVal);
      notify(`${k} ${newVal ? 'enabled' : 'disabled'}`);
    };
  });
}

/* ================================================================
   PAGE: REQUIREMENTS MAP
   ================================================================ */
function renderRequirements(el) {
  const reqs = [
    { id: 'REQ-001', title: 'User Authentication',       progress: 100, status: 'done',    priority: 'Critical', sprint: 'Sprint 1' },
    { id: 'REQ-002', title: 'AES-256 File Encryption',   progress: 100, status: 'done',    priority: 'Critical', sprint: 'Sprint 1' },
    { id: 'REQ-003', title: 'File Upload/Download',      progress: 100, status: 'done',    priority: 'High',     sprint: 'Sprint 2' },
    { id: 'REQ-004', title: 'Access Control',            progress: 85,  status: 'partial', priority: 'High',     sprint: 'Sprint 2' },
    { id: 'REQ-005', title: 'Expiring Share Links',      progress: 90,  status: 'partial', priority: 'Medium',   sprint: 'Sprint 3' },
    { id: 'REQ-006', title: 'Admin Dashboard',           progress: 75,  status: 'partial', priority: 'High',     sprint: 'Sprint 3' },
    { id: 'REQ-007', title: 'Two-Factor Authentication', progress: 60,  status: 'partial', priority: 'Critical', sprint: 'Sprint 4' },
    { id: 'REQ-008', title: 'Audit Logging',             progress: 40,  status: 'partial', priority: 'Medium',   sprint: 'Sprint 4' },
    { id: 'REQ-009', title: 'API Rate Limiting',         progress: 30,  status: 'todo',    priority: 'Medium',   sprint: 'Sprint 5' },
    { id: 'REQ-010', title: 'Mobile Responsive UI',      progress: 70,  status: 'partial', priority: 'Low',      sprint: 'Sprint 5' },
    { id: 'REQ-011', title: 'Backup & Recovery',         progress: 20,  status: 'todo',    priority: 'High',     sprint: 'Sprint 6' },
    { id: 'REQ-012', title: 'Analytics & Reporting',     progress: 50,  status: 'partial', priority: 'Medium',   sprint: 'Sprint 6' },
  ];
  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Requirements Map &amp; Monitoring</div>
      <div class="page-sub">Project requirements tracking and sprint monitoring</div>
    </div>
    <div class="header-actions" style="font-size:13px;color:var(--white60);gap:1rem">
      <span style="color:var(--success)">■</span> Complete (${reqs.filter(r => r.status === 'done').length})
      <span style="color:var(--warning)">■</span> In Progress (${reqs.filter(r => r.status === 'partial').length})
      <span style="color:var(--danger)">■</span> Planned (${reqs.filter(r => r.status === 'todo').length})
    </div>
  </div>
  <div class="req-grid">
    ${reqs.map(r => `<div class="req-card">
      <div class="req-id">${r.id} · ${r.sprint}</div>
      <div class="req-title">${r.title}</div>
      <div class="req-status-bar">
        <div class="req-fill ${r.status === 'done' ? 'fill-done' : r.status === 'partial' ? 'fill-partial' : 'fill-todo'}" style="width:${r.progress}%"></div>
      </div>
      <div class="req-meta">
        <span class="badge ${r.status === 'done' ? 'active' : r.status === 'partial' ? 'pending' : 'expired'}">${r.status === 'done' ? 'Complete' : r.status === 'partial' ? 'In Progress' : 'Planned'}</span>
        <span style="background:rgba(255,255,255,.06);border-radius:6px;padding:2px 8px;font-size:11px">${r.priority}</span>
        <span style="color:var(--blue3);font-size:12px;font-weight:600">${r.progress}%</span>
      </div>
    </div>`).join('')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem">
    <div class="chart-card"><div class="chart-title">Requirements by Priority</div><div class="chart-wrap"><canvas id="c-req-priority"></canvas></div></div>
    <div class="chart-card"><div class="chart-title">Sprint Progress Overview</div><div class="chart-wrap"><canvas id="c-sprint"></canvas></div></div>
  </div>`;

  setTimeout(() => {
    new Chart(document.getElementById('c-req-priority'), {
      type: 'doughnut',
      data: { labels: ['Critical', 'High', 'Medium', 'Low'], datasets: [{ data: [3, 4, 4, 1], backgroundColor: ['#f43f5e', '#f59e0b', '#1a6cf6', '#10d48e'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { labels: { color: 'rgba(255,255,255,.7)', font: { size: 11 }, boxWidth: 10 } } } },
    });
    new Chart(document.getElementById('c-sprint'), {
      type: 'bar',
      data: { labels: ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5', 'Sprint 6'], datasets: [
        { label: 'Completed', data: [100, 92, 82, 50, 0, 0],     backgroundColor: 'rgba(16,212,142,.7)', borderRadius: 4 },
        { label: 'Remaining', data: [0,   8,  18, 50, 100, 100], backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 4 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'rgba(255,255,255,.6)', font: { size: 11 }, boxWidth: 10 } } },
        scales: {
          x: { stacked: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { stacked: true, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
  }, 100);
}

/* ================================================================
   PAGE: ANALYTICS
   ================================================================ */
function renderAnalytics(el) {
  el.innerHTML = `
  <div class="page-header">
    <div><div class="page-title">KPIs, Burn Down &amp; Velocity</div><div class="page-sub">Automated dashboards and project health metrics</div></div>
    <div class="header-actions">
      <button class="btn btn-ghost" onclick="notify('Exporting PDF…')">${ICONS.download} Export PDF</button>
      <select><option>Last 30 days</option><option>Last 90 days</option><option>This year</option></select>
    </div>
  </div>
  <div class="kpi-grid">
    <div class="kpi-card blue"><div class="kpi-icon">${ICONS.file}</div><div class="kpi-label">Total Uploads</div><div class="kpi-value">2,481</div><div class="kpi-change up">▲ Target: 2,000 ✓</div></div>
    <div class="kpi-card green"><div class="kpi-icon">${ICONS.users}</div><div class="kpi-label">Daily Active Users</div><div class="kpi-value">348</div><div class="kpi-change up">▲ 89% retention rate</div></div>
    <div class="kpi-card yellow"><div class="kpi-icon">${ICONS.activity}</div><div class="kpi-label">Avg Sprint Velocity</div><div class="kpi-value">42 pts</div><div class="kpi-change up">▲ Sprint 4 record</div></div>
    <div class="kpi-card red"><div class="kpi-icon">${ICONS.warning}</div><div class="kpi-label">Security Incidents</div><div class="kpi-value">0</div><div class="kpi-change up">▲ 100% clean record</div></div>
  </div>
  <div class="charts-grid">
    <div class="chart-card wide">
      <div class="chart-title">Burn Down Chart <span class="chart-sub">Ideal vs Actual remaining story points</span></div>
      <div class="bd-legend"><div class="bd-leg-item"><div class="bd-leg-dot" style="background:#00c6ff"></div> Ideal</div><div class="bd-leg-item"><div class="bd-leg-dot" style="background:#f59e0b"></div> Actual</div></div>
      <div class="chart-wrap tall"><canvas id="c-burndown"></canvas></div>
    </div>
    <div class="chart-card"><div class="chart-title">Velocity Chart <span class="chart-sub">Story points per sprint</span></div><div class="chart-wrap tall"><canvas id="c-velocity"></canvas></div></div>
    <div class="chart-card"><div class="chart-title">User Growth <span class="chart-sub">Cumulative active users</span></div><div class="chart-wrap tall"><canvas id="c-users"></canvas></div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1.25rem">
    <div class="chart-card">
      <div class="chart-title">Risk Matrix</div>
      <div style="display:flex;flex-direction:column;gap:.75rem;margin-top:.5rem">
        ${[['Data Breach', 'Encryption + Backup', 'Low'], ['Unauthorized Access', '2FA + RBAC', 'Low'], ['Server Failure', 'Auto-scaling', 'Medium'], ['DDoS Attack', 'Rate limiting', 'Medium']]
          .map(([r, m, sev]) => `<div style="background:var(--card2);border-radius:10px;border:1px solid var(--border);padding:.75rem">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:13px;font-weight:600">${r}</div>
              <span class="badge ${sev === 'Low' ? 'active' : 'pending'}">${sev}</span>
            </div>
            <div style="font-size:11px;color:var(--white60)">${m}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="chart-card"><div class="chart-title">Download Trends</div><div class="chart-wrap" style="height:180px;margin-top:.5rem"><canvas id="c-dl"></canvas></div></div>
    <div class="chart-card"><div class="chart-title">Storage Growth</div><div class="chart-wrap" style="height:180px;margin-top:.5rem"><canvas id="c-stor-growth"></canvas></div></div>
  </div>`;

  setTimeout(() => {
    const sprints = ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30', 'Day 35', 'Day 40'];
    const total  = 200;
    const ideal  = sprints.map((_, i) => Math.round(total - (total / sprints.length * i)));
    const actual = [200, 185, 162, 148, 120, 95, 72, 55, 38];
    new Chart(document.getElementById('c-burndown'), {
      type: 'line', data: { labels: sprints, datasets: [
        { label: 'Ideal',  data: ideal,  borderColor: '#00c6ff', tension: .4, borderDash: [6, 3], pointRadius: 0 },
        { label: 'Actual', data: actual, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: .4, fill: true, pointRadius: 3, pointBackgroundColor: '#f59e0b' },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
    const vdata = [28, 35, 42, 38, 46, 40, 44, 42];
    const vAvg  = Math.round(vdata.reduce((a, b) => a + b) / vdata.length);
    new Chart(document.getElementById('c-velocity'), {
      type: 'bar', data: { labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'], datasets: [
        { label: 'Velocity', data: vdata, backgroundColor: vdata.map((_, i) => i === vdata.indexOf(Math.max(...vdata)) ? '#1a6cf6' : 'rgba(26,108,246,0.5)'), borderRadius: 6 },
        { label: 'Average',  data: vdata.map(() => vAvg), type: 'line', borderColor: '#f59e0b', borderDash: [4, 2], tension: 0, pointRadius: 0 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: 'rgba(255,255,255,.6)', font: { size: 11 }, boxWidth: 10 } } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
    new Chart(document.getElementById('c-users'), {
      type: 'line', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [
        { label: 'Active Users', data: [80, 145, 212, 280, 320, 348], borderColor: '#10d48e', backgroundColor: 'rgba(16,212,142,0.1)', tension: .4, fill: true, pointRadius: 4, pointBackgroundColor: '#10d48e' },
      ]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
    new Chart(document.getElementById('c-dl'), {
      type: 'bar', data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ data: [820, 1039, 950, 1200, 880, 340, 210], backgroundColor: 'rgba(26,108,246,0.6)', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
        },
      },
    });
    new Chart(document.getElementById('c-stor-growth'), {
      type: 'line', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], datasets: [{ data: [12, 24, 41, 58, 71, 84], borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)', tension: .4, fill: true, pointRadius: 3, pointBackgroundColor: '#f59e0b' }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: 'rgba(255,255,255,.4)', font: { size: 11 } }, callback: v => v + 'GB' },
        },
      },
    });
  }, 100);
}

/* ================================================================
   PAGE: SUBSCRIPTION
   ================================================================ */
async function renderSubscription(el) {
  el.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--white40)">Loading plans…</div>`;
  const [plansRes, billingRes] = await Promise.all([API.plans.list(), API.plans.billing()]);
  const plans        = plansRes.plans;
  const invoices     = billingRes.invoices;
  const currentPlanId = store.user.plan || 'free';
  const currentPlan   = plans.find(p => p.id === currentPlanId);

  const featCheck = f => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>${f}</li>`;
  const featX     = f => `<li class="na"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>${f}</li>`;

  el.innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Subscription &amp; Billing</div>
      <div class="page-sub">Manage your plan, usage, and payment history</div>
    </div>
    <div class="header-actions">
      <span class="enc-badge">${ICONS.star} Current: <strong style="margin-left:4px;text-transform:capitalize">${currentPlanId}</strong></span>
    </div>
  </div>

  <div class="table-card" style="padding:1.5rem;margin-bottom:1.75rem">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:2rem;align-items:center">
      <div>
        <div style="font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--white40);margin-bottom:.5rem">Your Current Plan</div>
        <div style="font-size:28px;font-weight:900;letter-spacing:-.5px;text-transform:capitalize">${currentPlanId}</div>
        <div style="font-size:13px;color:var(--white60);margin-top:.25rem">${currentPlan ? '$' + currentPlan.price + '/month' : ''} · Renews May 1, 2025</div>
      </div>
      <div>
        <div class="usage-meter-wrap">
          <div class="usage-label"><span>Storage Used</span><span>68.4 GB / ${currentPlan?.storage || '5 GB'}</span></div>
          <div class="usage-bar"><div class="usage-fill" style="width:${currentPlanId === 'free' ? '80' : currentPlanId === 'pro' ? '68' : '12'}%"></div></div>
        </div>
        <div class="usage-meter-wrap">
          <div class="usage-label"><span>Files</span><span>${store.files.length} / ${currentPlan?.maxFiles === -1 ? '∞' : currentPlan?.maxFiles || 50}</span></div>
          <div class="usage-bar"><div class="usage-fill" style="width:${currentPlanId === 'free' ? '10' : currentPlanId === 'pro' ? '0.1' : '0.05'}%;background:linear-gradient(90deg,#10d48e,#05f0a3)"></div></div>
        </div>
      </div>
      <div style="text-align:right">
        <button class="btn btn-ghost" onclick="notify('Invoice downloaded!')" style="margin-bottom:.5rem">${ICONS.download} Download Invoice</button><br/>
        <button class="btn btn-danger btn-sm" onclick="if(confirm('Cancel subscription?'))notify('Subscription cancelled')">Cancel Subscription</button>
      </div>
    </div>
  </div>

  <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--white40);margin-bottom:1rem">Available Plans</div>
  <div class="plans-grid">
    ${plans.map(p => `
    <div class="plan-card ${p.id === 'pro' ? 'featured' : ''}">
      <div class="plan-badge">${p.id === 'free' ? 'STARTER' : p.id === 'pro' ? 'PROFESSIONAL' : 'ENTERPRISE'}</div>
      <div class="plan-name" style="color:${p.id === 'free' ? 'var(--white)' : p.id === 'pro' ? 'var(--blue3)' : 'var(--cyan)'}">${p.name}</div>
      <div class="plan-price">
        <span class="plan-amount">$${p.price}</span>
        <span class="plan-period">${p.period}</span>
      </div>
      <div class="plan-divider"></div>
      <ul class="plan-features">
        ${p.features.map(featCheck).join('')}
        ${p.missing.map(featX).join('')}
      </ul>
      ${p.id === currentPlanId
        ? `<button class="plan-btn outline" disabled style="opacity:.5;cursor:default">Current Plan</button>`
        : `<button class="plan-btn ${p.id === 'enterprise' ? 'outline' : 'solid'} upgrade-btn" data-plan="${p.id}">
             ${p.price === 0 ? 'Downgrade' : 'Upgrade to ' + p.name}
           </button>`
      }
    </div>`).join('')}
  </div>

  <div class="table-card" style="margin-top:1.75rem">
    <div class="table-header">
      <div class="table-title">${ICONS.credit} Billing History</div>
      <button class="btn btn-ghost btn-sm" onclick="notify('Exporting…')">${ICONS.download} Export CSV</button>
    </div>
    <table class="billing-table">
      <thead><tr><th>Invoice</th><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        ${invoices.map(inv => `<tr>
          <td style="font-family:var(--mono);font-size:12px;color:var(--white60)">${inv.id}</td>
          <td style="font-size:13px">${inv.date}</td>
          <td><span class="badge shared">${inv.plan}</span></td>
          <td class="amount">${inv.amount}</td>
          <td><span class="status-${inv.status}" style="font-size:12px;font-weight:600;text-transform:capitalize">${inv.status}</span></td>
          <td><button class="btn btn-ghost btn-sm" onclick="notify('Downloading ${inv.id}…')">${ICONS.download}</button></td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <div class="table-card" style="margin-top:1.25rem;padding:1.5rem">
    <div class="config-section-title">${ICONS.credit} Payment Method</div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem;background:var(--card2);border:1px solid var(--border);border-radius:12px">
      <div style="display:flex;align-items:center;gap:1rem">
        <div style="background:rgba(26,108,246,.15);border-radius:8px;padding:.5rem .75rem;font-size:12px;font-weight:700;font-family:var(--mono);color:var(--blue3)">VISA</div>
        <div>
          <div style="font-size:13px;font-weight:600">•••• •••• •••• 4242</div>
          <div style="font-size:11px;color:var(--white40)">Expires 08/2027</div>
        </div>
      </div>
      <div style="display:flex;gap:.75rem">
        <button class="btn btn-ghost btn-sm" onclick="store.modal={type:'payment'};render()">Update Card</button>
        <span class="badge active">Default</span>
      </div>
    </div>
  </div>`;

  document.querySelectorAll('.upgrade-btn').forEach(b => {
    b.onclick = async () => {
      const planId = b.dataset.plan;
      const plan   = plans.find(p => p.id === planId);
      if (!confirm(`Upgrade to ${plan.name} ($${plan.price}/mo)?`)) return;
      b.textContent = 'Processing…'; b.disabled = true;
      const res = await API.plans.upgrade({ userId: store.user.id, planId });
      if (res.ok) {
        store.user.plan = planId;
        notify(`✓ Upgraded to ${plan.name}!`);
        renderSubscription(el);
      } else {
        notify('Upgrade failed', 'warning');
        b.disabled = false;
      }
    };
  });
}

/* ================================================================
   MODALS
   ================================================================ */
function buildModal() {
  const m = store.modal;

  if (m.type === 'share') {
    const f = m.file;
    return `<div class="modal-overlay" id="modal-overlay">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">Share File</div><button class="modal-close" id="modal-close">${ICONS.x}</button></div>
      <div class="modal-body">
        <div style="margin-bottom:1.25rem">
          <div class="config-key" style="margin-bottom:.5rem">File</div>
          <div style="background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1rem;display:flex;align-items:center;gap:.75rem">
            <div class="file-icon pdf" style="width:32px;height:32px;font-size:10px">${f.type.toUpperCase()}</div>
            <div><div style="font-weight:500;font-size:13px">${f.name}</div><div style="font-size:11px;color:var(--white40)">${f.size} · ${f.encrypted ? 'AES-256 Encrypted' : 'Unencrypted'}</div></div>
          </div>
        </div>
        <div class="config-row" style="padding-bottom:1rem">
          <div><div class="config-key">Expiry Date</div></div>
          <input class="form-input" type="date" value="${f.expiry}" style="width:180px"/>
        </div>
        <div class="config-row" style="padding-bottom:1rem">
          <div><div class="config-key">Access Level</div></div>
          <select><option>Link Only</option><option>Specific Email</option><option>Password Protected</option></select>
        </div>
        <div>
          <div class="config-key" style="margin-bottom:.5rem">Secure Share Link</div>
          <div class="link-box">${f.link}<button class="btn btn-ghost btn-sm" style="flex-shrink:0" onclick="notify('Link copied!')">${ICONS.copy}</button></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-close2">Cancel</button>
        <button class="btn btn-blue" onclick="notify('Secure link sent!');store.modal=null;render()">Send Link</button>
      </div>
    </div></div>`;
  }

  if (m.type === 'adduser') {
    return `<div class="modal-overlay" id="modal-overlay">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">Add New User</div><button class="modal-close" id="modal-close">${ICONS.x}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" type="text" id="new-name" placeholder="Full name"/></div>
        <div class="form-group"><label class="form-label">Email</label><input class="form-input" type="email" id="new-email" placeholder="user@company.com"/></div>
        <div class="form-group"><label class="form-label">Role</label><select id="new-role" style="width:100%"><option>User</option><option>Manager</option><option>Admin</option></select></div>
        <div class="form-group"><label class="form-label">Plan</label><select id="new-plan" style="width:100%"><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-close2">Cancel</button>
        <button class="btn btn-blue" id="save-user">Add User</button>
      </div>
    </div></div>`;
  }

  if (m.type === 'payment') {
    return `<div class="modal-overlay" id="modal-overlay">
    <div class="modal">
      <div class="modal-header"><div class="modal-title">Update Payment Method</div><button class="modal-close" id="modal-close">${ICONS.x}</button></div>
      <div class="modal-body">
        <div class="form-group"><label class="form-label">Card Number</label><input class="form-input" type="text" placeholder="1234 5678 9012 3456" maxlength="19"/></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group"><label class="form-label">Expiry</label><input class="form-input" type="text" placeholder="MM/YY" maxlength="5"/></div>
          <div class="form-group"><label class="form-label">CVC</label><input class="form-input" type="text" placeholder="123" maxlength="3"/></div>
        </div>
        <div class="form-group"><label class="form-label">Name on Card</label><input class="form-input" type="text" placeholder="Layla Hassan"/></div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-close2">Cancel</button>
        <button class="btn btn-blue" onclick="notify('Payment method updated!');store.modal=null;render()">Save Card</button>
      </div>
    </div></div>`;
  }
  return '';
}

function wireModal() {
  ['modal-close', 'modal-close2', 'modal-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.onclick = e => {
      if (id !== 'modal-overlay' || e.target === el) { store.modal = null; render(); }
    };
  });
  const saveUser = document.getElementById('save-user');
  if (saveUser) saveUser.onclick = async () => {
    const name  = document.getElementById('new-name').value  || 'New User';
    const email = document.getElementById('new-email').value || 'user@secureshare.io';
    const role  = document.getElementById('new-role').value;
    const res   = await API.users.add({ name, email, role });
    if (res.ok) {
      store.users.push(res.user);
      store.modal = null;
      notify('User added successfully');
      render();
    }
  };
}

/* ================================================================
   BOOT
   ================================================================ */
render();
