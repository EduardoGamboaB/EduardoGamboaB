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
// Descubrimiento de rutas: NO se exponen las URLs internas de los servicios
// (divulgación de infraestructura). Solo los prefijos públicos y, fuera de
// producción, el destino para depurar.
app.get('/api/gateway/routes', (_req, res) =>
  res.json(
    routeMap.map((r) => ({
      name: r.name,
      prefixes: r.prefixes,
      ...(config.isProd ? {} : { target: r.target }),
    }))
  )
);

// Un proxy por microservicio, montado a nivel raíz con `pathFilter` para
// PRESERVAR la ruta completa (/api/...). No parseamos el body: el stream se
// reenvía intacto al servicio destino.
for (const { prefixes, target, name } of routeMap) {
  const matches = (pathname) => prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    proxyTimeout: 30000,
    pathFilter: (pathname) => matches(pathname),
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
  app.use(proxy);
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
