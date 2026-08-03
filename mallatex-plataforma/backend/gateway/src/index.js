import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '@mallatex/shared/config';
import { routeMap } from './routes.map.js';

const NAME = 'gateway';
const PORT = Number(process.env.PORT || 3000);

const app = express();
if (config.http.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: config.http.corsOrigins.includes('*') ? true : config.http.corsOrigins, credentials: true }));
if (config.env !== 'test') app.use(morgan('tiny'));

// Salud del gateway y descubrimiento de servicios
app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: NAME, ts: new Date().toISOString() })
);
app.get('/api/gateway/routes', (_req, res) =>
  res.json(routeMap.map((r) => ({ name: r.name, target: r.target, prefixes: r.prefixes })))
);

// Un proxy por microservicio; se monta en todos sus prefijos.
// IMPORTANTE: no parseamos el body en el gateway para reenviar el stream intacto.
for (const { prefixes, target, name } of routeMap) {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 30000,
    on: {
      error(err, _req, res) {
        // eslint-disable-next-line no-console
        console.error(`[gateway] error proxy -> ${name} (${target}):`, err.message);
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Servicio ${name} no disponible` }));
        }
      },
    },
  });
  for (const p of prefixes) app.use(p, proxy);
}

app.get('/', (_req, res) =>
  res.json({
    plataforma: 'Mallatex',
    gateway: NAME,
    servicios: routeMap.map((r) => r.name),
    docs: '/api/gateway/routes',
  })
);

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[${NAME}] escuchando en :${PORT} (${config.env}) -> ${routeMap.length} servicios`);
});
const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
