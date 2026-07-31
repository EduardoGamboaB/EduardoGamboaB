// Capa de persistencia con backend conmutable.
//   STORAGE=file      → archivo JSON (por defecto; ideal para desarrollo/una réplica).
//   STORAGE=postgres  → PostgreSQL (producción; ver server/store/pg.js y DATABASE_URL).
//
// La estructura por "colecciones" y la API síncrona (all/find/get/insert/update/remove)
// se mantienen idénticas: la lógica de negocio (rules.js / routes) no cambia. En el modo
// PostgreSQL el estado se conserva en memoria y las mutaciones se escriben de forma
// diferida por fila; requiere `await db.init()` en el arranque (lo hace server/index.js).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { createPgDriver } from './store/pg.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LOCK_FILE = path.join(DATA_DIR, 'db.lock');

const MODE = config.storage === 'postgres' ? 'pg' : 'file';

const COLLECTIONS = [
  'users',
  'devices',
  'schedules',
  'sites',
  'clients',
  'visits',
  'salesRoutes',
  'salesObjectives',
  'products',
  'quotes',
  'orders',
  'expenseRequests',
  'expenses',
  'invoices',
  'employees',
  'checadas',
  'attendance',
  'incidents',
  'overtime',
  'periods',
  'noiConcepts',
  'variableConcepts',
  'variableEntries',
  'tickets',
  'payslips',
  'audit',
  'settings',
];

function emptyDb() {
  const db = {};
  for (const c of COLLECTIONS) db[c] = [];
  db.settings = {};
  db._seq = {};
  return db;
}

let cache = null;
let pgDriver = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ----- Inicialización (necesaria en modo PostgreSQL) -----
export async function init() {
  if (MODE === 'file') { load(); return { mode: 'file' }; }
  pgDriver = createPgDriver({ connectionString: config.databaseUrl, ssl: config.pgSsl, collections: COLLECTIONS });
  await pgDriver.connect();
  await pgDriver.ensureSchema();
  const locked = await pgDriver.acquireAdvisoryLock({ waitMs: config.pgLockWaitMs });
  if (!locked) throw new Error('Otra instancia ya tiene el bloqueo de escritura de la base de datos (pg_advisory_lock).');
  cache = await pgDriver.loadAll();
  return { mode: 'postgres' };
}

export function load() {
  if (cache) return cache;
  if (MODE === 'pg') throw new Error('La base de datos no está inicializada: llama a db.init() antes de usarla.');
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const c of COLLECTIONS) if (!cache[c]) cache[c] = c === 'settings' ? {} : [];
      if (!cache._seq) cache._seq = {};
    } catch (err) {
      console.error('No se pudo leer la base de datos, se reinicia:', err.message);
      cache = emptyDb();
    }
  } else {
    cache = emptyDb();
  }
  return cache;
}

// Escritura: en archivo persiste el snapshot completo; en PostgreSQL encola las
// operaciones por fila (write-behind). En ambos casos el estado en memoria ya está listo.
function persist(ops) {
  if (MODE === 'file') { writeSnapshotSync(); return; }
  if (ops && ops.length) pgDriver.enqueue(ops);
}

function writeSnapshotSync() {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function resetDb(data) {
  cache = data || emptyDb();
  if (MODE === 'file') writeSnapshotSync();
  else persist([{ op: 'replaceAll', data: cache }]);
  return cache;
}

// ----- Helpers de colección -----

function nextId(collection) {
  const db = load();
  db._seq[collection] = (db._seq[collection] || 0) + 1;
  return db._seq[collection];
}

export function all(collection, filterFn) {
  const db = load();
  const items = db[collection] || [];
  return filterFn ? items.filter(filterFn) : items.slice();
}

export function find(collection, filterFn) {
  const db = load();
  return (db[collection] || []).find(filterFn) || null;
}

export function get(collection, id) {
  const db = load();
  return (db[collection] || []).find((x) => x.id === Number(id)) || null;
}

export function insert(collection, record) {
  const db = load();
  const item = { id: nextId(collection), ...record };
  db[collection].push(item);
  persist([{ op: 'meta', key: '_seq', value: db._seq }, { op: 'upsert', collection, id: item.id, doc: item }]);
  return item;
}

export function insertMany(collection, records) {
  const db = load();
  const created = records.map((r) => ({ id: nextId(collection), ...r }));
  db[collection].push(...created);
  persist([{ op: 'meta', key: '_seq', value: db._seq }, ...created.map((item) => ({ op: 'upsert', collection, id: item.id, doc: item }))]);
  return created;
}

export function update(collection, id, patch) {
  const db = load();
  const item = db[collection].find((x) => x.id === Number(id));
  if (!item) return null;
  Object.assign(item, patch);
  persist([{ op: 'upsert', collection, id: item.id, doc: item }]);
  return item;
}

export function remove(collection, id) {
  const db = load();
  const idx = db[collection].findIndex((x) => x.id === Number(id));
  if (idx === -1) return false;
  db[collection].splice(idx, 1);
  persist([{ op: 'delete', collection, id: Number(id) }]);
  return true;
}

export function getSettings() {
  const db = load();
  return db.settings || {};
}

export function saveSettings(patch) {
  const db = load();
  db.settings = { ...db.settings, ...patch };
  persist([{ op: 'meta', key: 'settings', value: db.settings }]);
  return db.settings;
}

// ----- Operación en producción -----

// Vacía la cola de escritura pendiente (PostgreSQL). En archivo no hay cola.
export async function flush() {
  if (MODE === 'pg' && pgDriver) await pgDriver.flush();
}

// Cierre ordenado del backend.
export async function close() {
  if (MODE === 'file') { try { writeSnapshotSync(); } catch {} return; }
  if (pgDriver) await pgDriver.close();
}

// Respaldo del archivo de datos con rotación (sólo modo archivo; en PostgreSQL usa los
// respaldos gestionados del motor / pg_dump).
export function backup(keep = 14) {
  if (MODE !== 'file') return null;
  if (!fs.existsSync(DB_FILE)) return null;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(BACKUP_DIR, `db-${stamp}.json`);
  fs.copyFileSync(DB_FILE, dest);
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.startsWith('db-') && f.endsWith('.json')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch {}
  }
  return dest;
}

// Candado de instancia única. En archivo es un lock de fichero; en PostgreSQL el único
// escritor se garantiza con pg_advisory_lock (en init), por lo que aquí es un no-op.
export function acquireLock() {
  if (MODE !== 'file') return true;
  ensureDir();
  try {
    const fd = fs.openSync(LOCK_FILE, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    const pid = Number(fs.readFileSync(LOCK_FILE, 'utf8'));
    if (pid && isAlive(pid)) return false; // otra instancia viva
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  }
}
export function releaseLock() {
  if (MODE !== 'file') return;
  try {
    if (fs.existsSync(LOCK_FILE) && Number(fs.readFileSync(LOCK_FILE, 'utf8')) === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch {}
}
function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

export { DB_FILE, DATA_DIR, BACKUP_DIR, COLLECTIONS, MODE };
