/**
 * sae-bridge · Sincronización con el ERP legacy SAE (Aspel SAE / SAP / etc.).
 * Worker que escucha eventos de dominio y los traduce a llamadas al SAE.
 * También expone endpoints REST para sync manual y reconciliación.
 *
 * Endpoints:
 *   POST /sync/recepcion/:id      · push de una recepción al SAE
 *   POST /sync/egreso/:id         · push de un egreso (póliza)
 *   POST /sync/devolucion         · push de devolución MT-DT-005
 *   GET  /reconciliacion          · diferencias SAE vs MES
 */
import cors from '@fastify/cors'
import { buildServer } from '../../_shared/server'
import { consume } from '../../_shared/events'

const app = buildServer('sae-bridge')
await app.register(cors, { origin: true })

const SAE_API = process.env.SAE_API_URL ?? 'http://sae-mock:8080'
const SAE_TOKEN = process.env.SAE_API_TOKEN ?? 'dev-token'

async function pushToSae(endpoint: string, body: unknown) {
  // Llamada real al SAE legacy. En entornos sin acceso retorna stub.
  if (process.env.SAE_DRY_RUN === '1') {
    app.log.info({ endpoint, body }, '[DRY RUN] llamada al SAE simulada')
    return { ok: true, dry: true }
  }
  try {
    const res = await fetch(`${SAE_API}${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SAE_TOKEN}` },
      body: JSON.stringify(body),
    })
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
  } catch (e: any) {
    app.log.error(e, 'fallo al llamar al SAE')
    return { ok: false, error: e.message }
  }
}

app.post('/sync/recepcion/:id', async (req) => {
  const { id } = req.params as { id: string }
  return pushToSae('/recepciones', { mesId: id, ...((req.body as object) ?? {}) })
})

app.post('/sync/egreso/:id', async (req) => {
  const { id } = req.params as { id: string }
  return pushToSae('/polizas', { mesId: id, tipo: 'egreso-produccion', ...((req.body as object) ?? {}) })
})

app.post('/sync/devolucion', async (req) => {
  return pushToSae('/devoluciones', req.body)
})

app.get('/reconciliacion', async () => {
  // Stub — en real consultaría ambos sistemas y compararía folios/cantidades.
  return {
    fecha: new Date().toISOString(),
    diferencias: [],
    totalSae: 0,
    totalMes: 0,
  }
})

// ---------- Worker: reaccionar a eventos de dominio ----------
consume('sae-bridge', 'sae-1', async (evt) => {
  switch (evt.type) {
    case 'inventory.receipt.registered':
      await pushToSae('/recepciones', evt.payload)
      break
    case 'inventory.egreso.confirmed':
      await pushToSae('/polizas', { tipo: 'egreso', ...(evt.payload as object) })
      break
    case 'orders.delivered':
      await pushToSae('/facturas', evt.payload)
      break
    default:
      // ignora los demás
      break
  }
}).catch((e) => app.log.error(e))

const port = parseInt(process.env.PORT ?? '3005', 10)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(`sae-bridge escuchando en :${port}`)
