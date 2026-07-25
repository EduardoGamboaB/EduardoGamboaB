// Almacenamiento simple en archivo JSON con escritura atómica.
// Pensado para un evento (una sola instancia). Sin dependencias externas.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DATA = {
  event: {
    name: 'Anaberries · Expo',
    edition: '2026',
  },
  leads: [],   // { id, nombre, empresa, email, telefono, cargo, interes, volumen, notas, consentimiento, fuente, capturadoPor, createdAt }
  draws: [],   // { id, premio, leadId, nombre, empresa, createdAt }
};

let data = null;
let writeTimer = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function load() {
  ensureDir();
  try {
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // Rellena claves faltantes ante actualizaciones del esquema.
      data = { ...structuredClone(DEFAULT_DATA), ...data };
    } else {
      data = structuredClone(DEFAULT_DATA);
      persist();
    }
  } catch (err) {
    console.error('No se pudo leer db.json, se inicia vacío:', err.message);
    data = structuredClone(DEFAULT_DATA);
  }
  return data;
}

// Escritura atómica: escribe a un temporal y renombra.
function persist() {
  ensureDir();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// Persistencia diferida (agrupa escrituras cercanas en el tiempo).
export function save() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    try { persist(); } catch (e) { console.error('Error al guardar datos:', e.message); }
  }, 150);
}

export function flush() {
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null; }
  try { persist(); } catch (e) { console.error('Error al guardar datos:', e.message); }
}

export function db() {
  if (!data) load();
  return data;
}

// Identificador único legible y sin dependencias.
let seq = 0;
export function newId(prefix = 'id') {
  seq = (seq + 1) % 1000;
  const rnd = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  return `${prefix}_${Date.now().toString(36)}${seq.toString(36)}${rnd}`;
}

export { DATA_DIR, DATA_FILE };
