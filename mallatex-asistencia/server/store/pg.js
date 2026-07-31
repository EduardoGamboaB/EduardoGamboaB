// Driver de persistencia PostgreSQL para la capa de datos (db.js).
//
// Modelo: la aplicación mantiene TODO el estado en memoria (igual que con el archivo
// JSON) y sirve las lecturas de forma síncrona. Las MUTACIONES se aplican en memoria y
// se encolan para escribirse en PostgreSQL de forma diferida (write-behind) por fila,
// preservando el orden. Así la migración no exige reescribir la lógica de negocio.
//
// Durabilidad: la cola se vacía en el siguiente ciclo de evento (sub-milisegundo) y en el
// apagado ordenado (`flush()` se espera antes de salir). Para una réplica única esto
// combina el rendimiento del modelo en memoria con la durabilidad de PostgreSQL. Con
// varias réplicas, un `pg_advisory_lock` garantiza un único escritor por base de datos.
//
// Esquema:
//   store(collection text, id bigint, doc jsonb, PK(collection,id))
//   meta(key text PK, value jsonb)   -- guarda 'settings' y '_seq'

const ADVISORY_LOCK_KEY = 728141; // identificador arbitrario y estable de la app

export function createPgDriver({ connectionString, ssl, collections }) {
  let pg = null;
  let pool = null;
  let lockClient = null; // conexión dedicada que sostiene el advisory lock

  const queue = []; // operaciones pendientes: {op,collection,id,doc} | {op:'meta',key,value} | {op:'replaceAll',data}
  let draining = null; // Promise en curso de vaciado

  function emptyShape() {
    const d = {};
    for (const c of collections) d[c] = [];
    d.settings = {};
    d._seq = {};
    return d;
  }

  async function connect() {
    ({ default: pg } = await import('pg'));
    pool = new pg.Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: false } : false, max: 5 });
    // Verifica conectividad temprano (mejor error de arranque).
    const c = await pool.connect();
    c.release();
  }

  async function ensureSchema() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store (
        collection text NOT NULL,
        id bigint NOT NULL,
        doc jsonb NOT NULL,
        PRIMARY KEY (collection, id)
      );
      CREATE TABLE IF NOT EXISTS meta (
        key text PRIMARY KEY,
        value jsonb NOT NULL
      );
    `);
  }

  // Un único escritor por base de datos (evita corrupción con varias réplicas).
  // En un despliegue con solapamiento (Railway/Render/K8s) la instancia nueva arranca antes
  // de que muera la vieja; el advisory lock es a nivel de sesión y se libera solo al cerrarse
  // la conexión de la instancia anterior. Por eso reintentamos con espera acotada en lugar de
  // fallar de inmediato: así el nuevo contenedor toma el candado en cuanto el viejo se apaga.
  async function acquireAdvisoryLock({ waitMs = 45000, intervalMs = 2000 } = {}) {
    lockClient = await pool.connect();
    const deadline = Date.now() + Math.max(0, waitMs);
    let waited = false;
    for (;;) {
      const r = await lockClient.query('SELECT pg_try_advisory_lock($1) AS ok', [ADVISORY_LOCK_KEY]);
      if (r.rows[0].ok) {
        if (waited) console.log('[db] Candado de escritura adquirido tras esperar a la instancia anterior.');
        return true;
      }
      if (Date.now() >= deadline) {
        lockClient.release();
        lockClient = null;
        return false;
      }
      if (!waited) { console.log('[db] Otra instancia aún tiene el candado (despliegue en curso); esperando a que lo libere…'); waited = true; }
      await new Promise((res) => setTimeout(res, intervalMs));
    }
  }

  async function loadAll() {
    const data = emptyShape();
    const rows = await pool.query('SELECT collection, id, doc FROM store ORDER BY collection, id ASC');
    for (const r of rows.rows) {
      if (!data[r.collection]) data[r.collection] = [];
      data[r.collection].push(r.doc);
    }
    const meta = await pool.query('SELECT key, value FROM meta');
    for (const m of meta.rows) {
      if (m.key === 'settings') data.settings = m.value || {};
      else if (m.key === '_seq') data._seq = m.value || {};
    }
    return data;
  }

  function enqueue(ops) {
    for (const op of ops) queue.push(op);
    scheduleFlush();
  }

  function scheduleFlush() {
    if (!draining && queue.length) draining = drain().finally(() => { draining = null; });
  }

  async function drain() {
    while (queue.length) {
      const batch = queue.splice(0, queue.length);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const op of batch) await applyOp(client, op);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        // Reencola el lote para reintentar; evita perder escrituras ante un fallo transitorio.
        queue.unshift(...batch);
        console.error('PG flush falló, se reintentará:', err.message);
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        client.release();
      }
    }
  }

  async function applyOp(client, op) {
    if (op.op === 'upsert') {
      await client.query(
        'INSERT INTO store(collection, id, doc) VALUES($1,$2,$3) ON CONFLICT (collection,id) DO UPDATE SET doc = EXCLUDED.doc',
        [op.collection, op.id, JSON.stringify(op.doc)]
      );
    } else if (op.op === 'delete') {
      await client.query('DELETE FROM store WHERE collection=$1 AND id=$2', [op.collection, op.id]);
    } else if (op.op === 'meta') {
      await client.query(
        'INSERT INTO meta(key, value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [op.key, JSON.stringify(op.value)]
      );
    } else if (op.op === 'replaceAll') {
      await client.query('TRUNCATE store');
      const data = op.data;
      for (const collection of collections) {
        if (collection === 'settings') continue;
        for (const item of data[collection] || []) {
          await client.query('INSERT INTO store(collection,id,doc) VALUES($1,$2,$3)', [collection, item.id, JSON.stringify(item)]);
        }
      }
      await client.query('INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', ['settings', JSON.stringify(data.settings || {})]);
      await client.query('INSERT INTO meta(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', ['_seq', JSON.stringify(data._seq || {})]);
    }
  }

  async function flush() {
    scheduleFlush();
    if (draining) await draining;
  }

  async function close() {
    await flush();
    try { if (lockClient) { await lockClient.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]); lockClient.release(); } } catch {}
    if (pool) await pool.end();
  }

  return {
    kind: 'postgres',
    connect, ensureSchema, acquireAdvisoryLock, loadAll,
    enqueue, flush, close,
  };
}
