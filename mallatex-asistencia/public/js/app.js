// Bootstrap del SPA: acceso, shell, navegación y contexto global (admin + empleado).
import { api, getToken, setToken } from './api.js';
import { state, loadContext, currentPeriod, hasModule } from './state.js';
import { ROUTES, render, setRenderHook, defaultRoute } from './router.js';
import { h, clear, initials } from './ui.js';

const loginEl = document.getElementById('login');
const appEl = document.getElementById('app');
const loginForm = document.getElementById('login-form');

// ---------- Selector de persona ----------
let persona = 'admin';
document.querySelectorAll('#persona-seg button').forEach((b) => b.addEventListener('click', () => {
  persona = b.dataset.persona;
  document.querySelectorAll('#persona-seg button').forEach((x) => x.classList.toggle('active', x === b));
  document.getElementById('admin-fields').classList.toggle('hidden', persona !== 'admin');
  document.getElementById('emp-fields').classList.toggle('hidden', persona !== 'empleado');
  document.getElementById('hint-admin').classList.toggle('hidden', persona !== 'admin');
  document.getElementById('hint-emp').classList.toggle('hidden', persona !== 'empleado');
  document.getElementById('login-error').textContent = '';
}));

// ---------- Login ----------
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
  const errBox = document.getElementById('login-error');
  errBox.textContent = '';
  const payload = persona === 'empleado'
    ? { code: fd.get('code'), pin: fd.get('pin') }
    : { email: fd.get('email'), password: fd.get('password') };
  try {
    const r = await api.post('/auth/login', payload);
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

// ---------- Periodo (sólo admin) ----------
const periodSelect = document.getElementById('period-select');
const periodPicker = document.querySelector('.period-picker');
periodSelect.addEventListener('change', () => { state.currentPeriodId = Number(periodSelect.value); render(); });

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
    if (r.principal !== state.principal) continue;
    // El menú lo dicta el backend: sólo se muestran los módulos permitidos para el rol/perfil.
    if (!hasModule(r.key)) continue;
    (groups[r.group] ||= []).push(r);
  }
  for (const [group, items] of Object.entries(groups)) {
    nav.appendChild(h('div', { class: 'nav-group' }, group));
    for (const r of items) {
      nav.appendChild(h('a', { href: `#${r.key}`, dataset: { key: r.key } },
        h('span', { class: 'ico' }, r.icon),
        h('span', {}, r.label),
        r.badge ? h('span', { class: 'badge-count hidden', dataset: { badge: r.badge } }, '0') : null,
      ));
    }
  }
}

async function refreshBadges() {
  if (state.principal !== 'admin') return;
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
  document.getElementById('view-sub').textContent = state.principal === 'admin' && period ? `${period.name} · ${period.status}` : (state.principal === 'empleado' ? 'Portal del empleado' : '');
  refreshBadges();
  document.querySelector('.sidebar')?.classList.remove('open');
}

// ---------- Arranque ----------
async function start() {
  await loadContext();
  loginEl.classList.add('hidden');
  appEl.classList.remove('hidden');

  const principalName = state.principal === 'empleado' ? state.employee.name : state.user.name;
  document.getElementById('user-name').textContent = principalName;
  document.getElementById('user-role').textContent = state.roleLabel;
  document.getElementById('user-avatar').textContent = initials(principalName);
  periodPicker.classList.toggle('hidden', state.principal !== 'admin');

  buildNav();
  renderPeriodSelect();
  setRenderHook(setActiveNav);
  // Evita doble render: fijar el hash dispara hashchange→render; si ya hay hash, render una vez.
  const wanted = location.hash.slice(1);
  if (!wanted) location.hash = defaultRoute();
  else await render();
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

if (getToken()) {
  start().catch(() => { setToken(null); loginEl.classList.remove('hidden'); appEl.classList.add('hidden'); });
}
