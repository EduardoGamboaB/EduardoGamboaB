#!/usr/bin/env node
/**
 * Runner de MIGRACIONES VERSIONADAS para el esquema relacional PostgreSQL.
 *
 *   node database/migrate.js up       -> aplica las migraciones pendientes
 *   node database/migrate.js status   -> lista aplicadas vs pendientes
 *   node database/migrate.js down     -> elimina TODOS los esquemas (destructivo)
 *   node database/migrate.js reset    -> down + up
 *
 * Convención: database/migrations/NNNN_nombre.sql, aplicadas en orden
 * lexicográfico y registradas en public.schema_migrations. El baseline
 * (schema.sql) se registra como versión 0000_baseline: en bases nuevas se
 * aplica; en bases existentes previas a este runner se registra sin re-aplicar
 * (el DDL es idempotente, así que re-aplicarlo tampoco daña).
 *
 * Usa DATABASE_URL (y DATABASE_SSL=true para bases gestionadas).
 */
import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS = ['leads', 'mes', 'crm', 'attendance', 'identity'];
const BASELINE = '0000_baseline';

async function client() {
  const url = process.env.DATABASE_URL || 'postgres://mallatex:mallatex@localhost:5432/mallatex';
  const c = new pg.Client({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });
  await c.connect();
  return c;
}

async function ensureMeta(c) {
  await c.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
}

async function applied(c) {
  const r = await c.query('SELECT version FROM public.schema_migrations ORDER BY version');
  return new Set(r.rows.map((x) => x.version));
}

async function migrationFiles() {
  const dir = join(__dirname, 'migrations');
  const files = (await readdir(dir).catch(() => [])).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  return files;
}

async function up() {
  const c = await client();
  try {
    await ensureMeta(c);
    const done = await applied(c);

    // Baseline: schema.sql completo (idempotente).
    if (!done.has(BASELINE)) {
      const sql = await readFile(join(__dirname, 'schema.sql'), 'utf8');
      await c.query('BEGIN');
      await c.query(sql);
      await c.query('INSERT INTO public.schema_migrations(version) VALUES ($1)', [BASELINE]);
      await c.query('COMMIT');
      console.log(`  ✓ ${BASELINE} (schema.sql)`);
    }

    // Incrementales pendientes, en orden y cada una en su transacción.
    let pending = 0;
    for (const f of await migrationFiles()) {
      const version = f.replace(/\.sql$/, '');
      if (done.has(version)) continue;
      const sql = await readFile(join(__dirname, 'migrations', f), 'utf8');
      await c.query('BEGIN');
      try {
        await c.query(sql);
        await c.query('INSERT INTO public.schema_migrations(version) VALUES ($1)', [version]);
        await c.query('COMMIT');
        console.log(`  ✓ ${version}`);
        pending++;
      } catch (e) {
        await c.query('ROLLBACK');
        throw new Error(`Migración ${version} falló: ${e.message}`);
      }
    }
    console.log(pending || !done.has(BASELINE) ? '✓ Migraciones aplicadas' : '✓ Sin migraciones pendientes');
  } finally {
    await c.end();
  }
}

async function status() {
  const c = await client();
  try {
    await ensureMeta(c);
    const done = await applied(c);
    const files = [BASELINE, ...(await migrationFiles()).map((f) => f.replace(/\.sql$/, ''))];
    for (const v of files) console.log(`  ${done.has(v) ? '✓ aplicada ' : '· pendiente'}  ${v}`);
  } finally {
    await c.end();
  }
}

async function down() {
  const c = await client();
  try {
    for (const s of SCHEMAS) await c.query(`DROP SCHEMA IF EXISTS ${s} CASCADE`);
    await c.query('DROP TABLE IF EXISTS public.schema_migrations');
    console.log('✓ Esquemas y registro de migraciones eliminados');
  } finally {
    await c.end();
  }
}

const cmd = process.argv[2] || 'up';
try {
  if (cmd === 'up') await up();
  else if (cmd === 'status') await status();
  else if (cmd === 'down') await down();
  else if (cmd === 'reset') {
    await down();
    await up();
  } else {
    console.error(`Comando desconocido: ${cmd} (usa up|status|down|reset)`);
    process.exit(1);
  }
} catch (e) {
  console.error('Error de migración:', e.message);
  process.exit(1);
}
