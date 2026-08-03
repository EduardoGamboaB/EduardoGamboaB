#!/usr/bin/env node
/**
 * Runner de migraciones para el esquema relacional PostgreSQL.
 *
 *   node database/migrate.js up      -> aplica schema.sql (idempotente)
 *   node database/migrate.js down    -> elimina los esquemas (DROP)
 *   node database/migrate.js reset   -> down + up
 *
 * Usa DATABASE_URL. Las migraciones incrementales viven en database/migrations/.
 */
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS = ['leads', 'mes', 'crm', 'attendance', 'identity'];

async function client() {
  const url = process.env.DATABASE_URL || 'postgres://mallatex:mallatex@localhost:5432/mallatex';
  const c = new pg.Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();
  return c;
}

async function up() {
  const c = await client();
  try {
    const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8');
    await c.query(sql);
    // Migraciones incrementales (orden alfabético)
    const dir = join(__dirname, 'migrations');
    const files = (await readdir(dir).catch(() => [])).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      const m = await readFile(join(dir, f), 'utf8');
      await c.query(m);
      console.log(`  ✓ migración ${f}`);
    }
    console.log('✓ Esquema aplicado');
  } finally {
    await c.end();
  }
}

async function down() {
  const c = await client();
  try {
    for (const s of SCHEMAS) {
      await c.query(`DROP SCHEMA IF EXISTS ${s} CASCADE`);
    }
    console.log('✓ Esquemas eliminados');
  } finally {
    await c.end();
  }
}

const cmd = process.argv[2] || 'up';
try {
  if (cmd === 'up') await up();
  else if (cmd === 'down') await down();
  else if (cmd === 'reset') {
    await down();
    await up();
  } else {
    console.error(`Comando desconocido: ${cmd}`);
    process.exit(1);
  }
} catch (e) {
  console.error('Error de migración:', e.message);
  process.exit(1);
}
