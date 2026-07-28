// Almacenamiento de la aplicación.
// Dos modos, elegidos automáticamente:
//   - Postgres  → si existe DATABASE_URL (recomendado en Railway; datos durables).
//   - Archivo   → JSON local en DATA_DIR (por defecto para desarrollo/eventos sin BD).
// El estado (event, leads, draws) se mantiene en memoria y se persiste de forma
// diferida. Las imágenes (gafetes, premio) se guardan como "blobs".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const BLOBS_DIR = path.join(DATA_DIR, 'blobs');

export const MODE = process.env.DATABASE_URL ? 'postgres' : 'file';

// Plantilla de un evento.
export function nuevoEvento(over = {}) {
  return {
    id: newId('ev'),
    name: 'Evento',
    edition: '',
    tipo: '',
    premio: '',
    premioImagen: false,
    dinamica: '',
    fecha: '',
    hora: '',
    lugar: '',
    plazoContactoDias: '',
    // ¿Los ganadores de OTROS eventos pueden participar en éste? (default: sí)
    permiteGanadoresPrevios: true,
    finalizado: false, // true = evento culminado (pasa al histórico)
    createdAt: new Date().toISOString(),
    actualizadoAt: '',
    ...over,
  };
}

const DEFAULT_DATA = {
  events: [],        // [{ id, name, ... }]
  activeEventId: '', // evento seleccionado por defecto en el staff
  leads: [],         // [{ ..., eventId }]
  draws: [],         // [{ ..., eventId, folio, email, emailEnviado }]
  users: [],         // [{ id, email, name, role, passwordHash, activo, createdAt }]
  authSecret: '',    // secreto para firmar tokens (se genera al primer arranque)
  setupCompleted: false, // true = configuración inicial finalizada (deshabilita el NIP)
};

let data = null;
let writeTimer = null;
let pool = null; // pg Pool en modo postgres

// ---------- Utilidades ----------
function withEventDefaults(d) {
  const raw = d || {};
  // ¿El dato ORIGINAL traía ya el flag? (antes de fusionar los valores por defecto)
  const teniaSetupFlag = typeof raw.setupCompleted === 'boolean';
  d = { ...structuredClone(DEFAULT_DATA), ...raw };
  if (!Array.isArray(d.leads)) d.leads = [];
  if (!Array.isArray(d.draws)) d.draws = [];
  if (!Array.isArray(d.users)) d.users = [];
  if (typeof d.authSecret !== 'string') d.authSecret = '';
  // Estado de la configuración inicial (NIP). Si el dato no traía el flag, las bases
  // que YA tienen usuarios se consideran configuradas (no abren el NIP por sorpresa);
  // una base nueva y vacía queda abierta para la configuración inicial.
  if (!teniaSetupFlag) d.setupCompleted = d.users.length > 0;

  // Migración desde el esquema de evento único (d.event) a múltiples eventos.
  if (!Array.isArray(d.events) || d.events.length === 0) {
    const base = d.event && typeof d.event === 'object' ? d.event : {};
    const ev = nuevoEvento({
      name: base.name || 'Anaberries · Expo',
      edition: base.edition || '2026',
      tipo: base.tipo || '', premio: base.premio || '', premioImagen: !!base.premioImagen,
      dinamica: base.dinamica || '', fecha: base.fecha || '', hora: base.hora || '',
      lugar: base.lugar || '', plazoContactoDias: base.plazoContactoDias || '',
      permiteGanadoresPrevios: base.permiteGanadoresPrevios !== false,
    });
    d.events = [ev];
    d.activeEventId = ev.id;
  }
  // Normaliza campos faltantes de cada evento.
  d.events = d.events.map((e) => ({ ...nuevoEvento(), ...e }));
  // Evento activo válido.
  if (!d.activeEventId || !d.events.some((e) => e.id === d.activeEventId)) {
    d.activeEventId = d.events[0].id;
  }
  // Asigna eventId a leads/draws que no lo tengan (datos previos a multi-evento).
  for (const l of d.leads) if (!l.eventId) l.eventId = d.activeEventId;
  for (const dr of d.draws) if (!dr.eventId) dr.eventId = d.activeEventId;

  delete d.event; // ya migrado
  return d;
}
function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }

// ---------- Inicialización ----------
export async function init() {
  if (MODE === 'postgres') {
    await initPg();
  } else {
    initFile();
  }
  return { mode: MODE };
}

function initFile() {
  ensureDir(DATA_DIR);
  try {
    if (fs.existsSync(DATA_FILE)) {
      data = withEventDefaults(JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')));
    } else {
      data = withEventDefaults(structuredClone(DEFAULT_DATA));
      persistFile();
    }
  } catch (err) {
    console.error('No se pudo leer db.json, se inicia vacío:', err.message);
    data = withEventDefaults(structuredClone(DEFAULT_DATA));
  }
}

// Extrae host/puerto/base de la URL SIN exponer la contraseña (para los logs).
function safeUrlInfo(url) {
  try { const u = new URL(url); return { host: u.hostname, port: u.port || '5432', database: (u.pathname || '').replace(/^\//, '') || '(default)' }; }
  catch { return { host: '(no se pudo leer)', port: '?', database: '?' }; }
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const isSslError = (e) => /ssl|sslmode|encryption/i.test(`${e && e.message} ${e && e.code}`);

async function connectPg(pg, url, ssl) {
  const p = new pg.Pool({ connectionString: url, ssl, max: 5, connectionTimeoutMillis: 6000, idleTimeoutMillis: 30000 });
  try { await p.query('SELECT 1'); return p; }
  catch (e) { try { await p.end(); } catch { /* ignore */ } throw e; }
}

async function initPg() {
  const pg = (await import('pg')).default;
  const url = process.env.DATABASE_URL;
  const info = safeUrlInfo(url);
  const wantSsl = /sslmode=require/.test(url) || process.env.DATABASE_SSL === 'true';
  // Autodetección de SSL: intenta primero lo indicado y, si el error es de SSL, el opuesto.
  const sslCandidates = wantSsl ? [{ rejectUnauthorized: false }, undefined] : [undefined, { rejectUnauthorized: false }];
  const attempts = Number(process.env.DB_CONNECT_RETRIES) || 6;

  let lastErr = null;
  for (let attempt = 1; attempt <= attempts && !pool; attempt++) {
    for (const ssl of sslCandidates) {
      try {
        pool = await connectPg(pg, url, ssl);
        console.log(`Almacenamiento: PostgreSQL conectado (${info.host}:${info.port}/${info.database}, ssl=${ssl ? 'on' : 'off'})`);
        break;
      } catch (e) {
        lastErr = e;
        // Si el error NO es de SSL, probar el otro modo SSL no ayuda: pasa al reintento.
        if (!isSslError(e)) break;
      }
    }
    if (pool) break;
    const code = (lastErr && (lastErr.code || lastErr.message)) || 'error desconocido';
    console.error(`Postgres: intento ${attempt}/${attempts} falló → ${code} (host ${info.host}:${info.port})`);
    if (attempt < attempts) await wait(Math.min(1500 * attempt, 6000));
  }

  if (!pool) {
    const code = (lastErr && (lastErr.code || lastErr.message)) || 'error desconocido';
    const err = new Error(`No se pudo conectar a PostgreSQL (${info.host}:${info.port}/${info.database}) — ${code}. ` +
      `Revisa DATABASE_URL; si usas la URL pública del proxy, agrega DATABASE_SSL=true.`);
    err.cause = lastErr;
    throw err;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id SMALLINT PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS app_blob (
      key TEXT PRIMARY KEY,
      mime TEXT NOT NULL DEFAULT 'image/jpeg',
      data BYTEA NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  const r = await pool.query('SELECT data FROM app_state WHERE id = 1');
  if (r.rows.length) {
    data = withEventDefaults(r.rows[0].data);
  } else {
    data = withEventDefaults(structuredClone(DEFAULT_DATA));
    await pool.query('INSERT INTO app_state (id, data) VALUES (1, $1)', [JSON.stringify(data)]);
  }
}

// ---------- Persistencia del estado ----------
function persistFile() {
  ensureDir(DATA_DIR);
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

async function persistPg() {
  await pool.query(
    'UPDATE app_state SET data = $1, updated_at = now() WHERE id = 1',
    [JSON.stringify(data)]
  );
}

async function persist() {
  try {
    if (MODE === 'postgres') await persistPg();
    else persistFile();
  } catch (e) {
    console.error('Error al guardar datos:', e.message);
  }
}

// Persistencia diferida (agrupa escrituras cercanas en el tiempo).
export function save() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => { writeTimer = null; persist(); }, 150);
}

export async function flush() {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  await persist();
  if (MODE === 'postgres' && pool) { try { await pool.end(); } catch { /* ignore */ } }
}

export function db() {
  if (!data) throw new Error('El almacén no está inicializado (llama a init())');
  return data;
}

// Helpers de eventos.
export function getEvents() { return db().events; }
export function getEvent(id) { return db().events.find((e) => e.id === id) || null; }
export function activeEvent() { const d = db(); return getEvent(d.activeEventId) || d.events[0]; }

// Helpers de usuarios.
export function getUsers() { return db().users; }
export function getUserById(id) { return db().users.find((u) => u.id === id) || null; }
export function getUserByEmail(email) { const e = String(email || '').toLowerCase(); return db().users.find((u) => u.email === e) || null; }

// ---------- Blobs (imágenes) ----------
function blobFile(key) { return path.join(BLOBS_DIR, key.replace(/[^\w.-]/g, '_') + '.bin'); }

export async function putBlob(key, buf, mime = 'image/jpeg') {
  if (MODE === 'postgres') {
    await pool.query(
      `INSERT INTO app_blob (key, mime, data, updated_at) VALUES ($1,$2,$3, now())
       ON CONFLICT (key) DO UPDATE SET mime = EXCLUDED.mime, data = EXCLUDED.data, updated_at = now()`,
      [key, mime, buf]
    );
  } else {
    ensureDir(BLOBS_DIR);
    fs.writeFileSync(blobFile(key), buf);
  }
}

export async function getBlob(key) {
  if (MODE === 'postgres') {
    const r = await pool.query('SELECT data FROM app_blob WHERE key = $1', [key]);
    return r.rows.length ? r.rows[0].data : null;
  }
  const f = blobFile(key);
  return fs.existsSync(f) ? fs.readFileSync(f) : null;
}

export async function delBlob(key) {
  if (MODE === 'postgres') {
    await pool.query('DELETE FROM app_blob WHERE key = $1', [key]);
  } else {
    try { fs.rmSync(blobFile(key)); } catch { /* no existía */ }
  }
}

// ---------- Identificadores ----------
let seq = 0;
export function newId(prefix = 'id') {
  seq = (seq + 1) % 1000;
  const rnd = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${rnd}`;
}

export { DATA_DIR, DATA_FILE };
