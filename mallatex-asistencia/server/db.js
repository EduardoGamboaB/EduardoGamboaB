// Capa de persistencia sencilla basada en un archivo JSON.
// Sin dependencias nativas: ideal para un prototipo que corre en cualquier entorno.
// La estructura por "colecciones" permite migrar a un motor SQL real más adelante
// sin tocar la lógica de negocio (rules.js / routes).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// El directorio de datos es configurable (DATA_DIR) para montar un volumen persistente.
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LOCK_FILE = path.join(DATA_DIR, 'db.lock');

const COLLECTIONS = [
  'users',
  'devices',
  'schedules',
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

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function load() {
  if (cache) return cache;
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

export function persist() {
  ensureDir();
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function resetDb(data) {
  cache = data || emptyDb();
  persist();
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
  persist();
  return item;
}

export function insertMany(collection, records) {
  const db = load();
  const created = records.map((r) => ({ id: nextId(collection), ...r }));
  db[collection].push(...created);
  persist();
  return created;
}

export function update(collection, id, patch) {
  const db = load();
  const item = db[collection].find((x) => x.id === Number(id));
  if (!item) return null;
  Object.assign(item, patch);
  persist();
  return item;
}

export function remove(collection, id) {
  const db = load();
  const idx = db[collection].findIndex((x) => x.id === Number(id));
  if (idx === -1) return false;
  db[collection].splice(idx, 1);
  persist();
  return true;
}

export function getSettings() {
  const db = load();
  return db.settings || {};
}

export function saveSettings(patch) {
  const db = load();
  db.settings = { ...db.settings, ...patch };
  persist();
  return db.settings;
}

// ----- Operación en producción -----

// Respaldo del archivo de datos con rotación (conserva los últimos `keep`).
export function backup(keep = 14) {
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

// Candado de instancia única: evita que dos procesos compartan el mismo DATA_DIR
// (la persistencia en archivo JSON no es segura entre procesos).
export function acquireLock() {
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
    // Candado huérfano (proceso muerto): se reemplaza.
    fs.writeFileSync(LOCK_FILE, String(process.pid));
    return true;
  }
}
export function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE) && Number(fs.readFileSync(LOCK_FILE, 'utf8')) === process.pid) fs.unlinkSync(LOCK_FILE);
  } catch {}
}
function isAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

export { DB_FILE, DATA_DIR, BACKUP_DIR, COLLECTIONS };
