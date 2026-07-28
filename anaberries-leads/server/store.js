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

const DEFAULT_DATA = {
  event: {
    name: 'Anaberries · Expo',
    edition: '2026',
    tipo: '',
    premio: '',
    premioImagen: false,
    dinamica: '',
    fecha: '',
    hora: '',
    lugar: '',
    plazoContactoDias: '',
    actualizadoAt: '',
  },
  leads: [],
  draws: [],
};

let data = null;
let writeTimer = null;
let pool = null; // pg Pool en modo postgres

// ---------- Utilidades ----------
function withEventDefaults(d) {
  d = { ...structuredClone(DEFAULT_DATA), ...(d || {}) };
  d.event = { ...structuredClone(DEFAULT_DATA.event), ...(d.event || {}) };
  if (!Array.isArray(d.leads)) d.leads = [];
  if (!Array.isArray(d.draws)) d.draws = [];
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
      data = structuredClone(DEFAULT_DATA);
      persistFile();
    }
  } catch (err) {
    console.error('No se pudo leer db.json, se inicia vacío:', err.message);
    data = structuredClone(DEFAULT_DATA);
  }
}

async function initPg() {
  const pg = (await import('pg')).default;
  const url = process.env.DATABASE_URL;
  const ssl = /sslmode=require/.test(url) || process.env.DATABASE_SSL === 'true'
    ? { rejectUnauthorized: false } : undefined;
  pool = new pg.Pool({ connectionString: url, ssl, max: 5 });
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
    data = structuredClone(DEFAULT_DATA);
    await pool.query('INSERT INTO app_state (id, data) VALUES (1, $1)', [JSON.stringify(data)]);
  }
  console.log('Almacenamiento: PostgreSQL conectado');
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
