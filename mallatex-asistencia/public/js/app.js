// Bootstrap del SPA: acceso, shell, navegación y contexto global.
import { api, getToken, setToken } from './api.js';
import { state, loadContext, currentPeriod } from './state.js';
import { ROUTES, render, navigate, setRenderHook } from './router.js';
import { h, clear, initials, toast } from './ui.js';

const loginEl = document.getElementById('login');
const appEl = document.getElementById('app');

// ---------- Login ----------
const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';
  try {
    const r = await api.post('/auth/login', { email: fd.get('email'), password: fd.get('password') });
    setToken(r.token);
    await start();
  } catch (err) {
    errBox.textContent = err.message || 'No se pudo iniciar sesión';
  }
});
document.querySelectorAll('[data-demo]').forEach((b) => b.addEventListener('click', () => {
  loginForm.email.value = b.dataset.demo;
  loginForm.password.value = 'mallatex2026';
}));

// ---------- Logout ----------
document.getElementById('logout-btn').addEventListener('click', async () => {
  try { await api.post('/auth/logout'); } catch {}
  setToken(null);
  location.reload();
});

// ---------- Periodo ----------
const periodSelect = document.getElementById('period-select');
periodSelect.addEventListener('change', () => {
  state.currentPeriodId = Number(periodSelect.value);
  render();
});

function renderPeriodSelect() {
  clear(periodSelect);
  for (const p of state.periods) {
    const o = h('option', { value: p.id }, `${p.name} · ${p.status}`);
    if (p.id === state.currentPeriodId) o.selected = true;
    periodSelect.appendChild(o);
  }
}

// ---------- Navegación ----------
function buildNav() {
  const nav = document.getElementById('nav');
  clear(nav);
  const groups = {};
  for (const r of ROUTES) {
    if (r.roles && !r.roles.includes(state.user.role)) continue;
    (groups[r.group] ||= []).push(r);
  }
  for (const [group, items] of Object.entries(groups)) {
    nav.appendChild(h('div', { class: 'nav-group' }, group));
    for (const r of items) {
      const a = h('a', { href: `#${r.key}`, dataset: { key: r.key } },
        h('span', { class: 'ico' }, r.icon),
        h('span', {}, r.label),
        r.badge ? h('span', { class: 'badge-count hidden', dataset: { badge: r.badge } }, '0') : null,
      );
      nav.appendChild(a);
    }
  }
}

async function refreshBadges() {
  try {
    const [inc, ot] = await Promise.all([
      api.get('/incidents?status=pendiente'),
      api.get('/overtime?status=pendiente'),
    ]);
    const counts = { incidents: inc.length, overtime: ot.length };
    document.querySelectorAll('[data-badge]').forEach((el) => {
      const n = counts[el.dataset.badge] || 0;
      el.textContent = String(n);
      el.classList.toggle('hidden', n === 0);
    });
  } catch {}
}

function setActiveNav(key) {
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.key === key));
  const period = currentPeriod();
  document.getElementById('view-sub').textContent = period ? `${period.name} · ${period.status}` : '';
  refreshBadges();
  document.querySelector('.sidebar')?.classList.remove('open');
}

// ---------- Arranque ----------
async function start() {
  await loadContext();
  loginEl.classList.add('hidden');
  appEl.classList.remove('hidden');

  document.getElementById('user-name').textContent = state.user.name;
  document.getElementById('user-role').textContent = state.roleLabel;
  document.getElementById('user-avatar').textContent = initials(state.user.name);

  buildNav();
  renderPeriodSelect();
  setRenderHook(setActiveNav);
  if (!location.hash) location.hash = 'dashboard';
  await render();
  refreshBadges();
}

// Refrescar badges/periodos cuando una vista lo solicite
window.addEventListener('mtx:refresh', async () => {
  const { refreshPeriods } = await import('./state.js');
  await refreshPeriods();
  renderPeriodSelect();
  refreshBadges();
});

document.getElementById('menu-toggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

window.addEventListener('hashchange', render);

// Sesión existente
if (getToken()) {
  start().catch(() => { setToken(null); loginEl.classList.remove('hidden'); appEl.classList.add('hidden'); });
}
