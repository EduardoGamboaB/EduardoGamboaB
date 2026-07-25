// Migración de datos: archivo JSON → PostgreSQL.
// Uso:
//   DATABASE_URL=postgres://user:pass@host:5432/db  node server/migrate-to-pg.js
//   (opcional) SRC_DB=/ruta/db.json para indicar el archivo de origen.
//
// Copia TODO el contenido de db.json a PostgreSQL (reemplazando lo existente). Ejecuta
// esto una sola vez al cambiar de STORAGE=file a STORAGE=postgres.

import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { COLLECTIONS } from './db.js';
import { createPgDriver } from './store/pg.js';

const src = process.env.SRC_DB || path.join(config.dataDir, 'db.json');

if (!config.databaseUrl) {
  console.error('Falta DATABASE_URL. Ejemplo: DATABASE_URL=postgres://mtx:***@host:5432/mallatex');
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error(`No se encontró el archivo de origen: ${src}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
for (const c of COLLECTIONS) if (c !== 'settings' && !Array.isArray(data[c])) data[c] = [];
data.settings = data.settings || {};
data._seq = data._seq || {};

const total = COLLECTIONS.filter((c) => c !== 'settings').reduce((n, c) => n + (data[c]?.length || 0), 0);
const safeUrl = config.databaseUrl.replace(/\/\/[^@]*@/, '//***@');

const drv = createPgDriver({ connectionString: config.databaseUrl, ssl: config.pgSsl, collections: COLLECTIONS });
await drv.connect();
await drv.ensureSchema();
const locked = await drv.acquireAdvisoryLock();
if (!locked) { console.error('Otra instancia tiene el bloqueo de escritura; detén la app antes de migrar.'); process.exit(1); }

drv.enqueue([{ op: 'replaceAll', data }]);
await drv.flush();
await drv.close();

console.log(`Migración completada → ${safeUrl}`);
console.log(`Registros migrados: ${total} · empleados: ${data.employees.length} · usuarios: ${data.users.length}`);
