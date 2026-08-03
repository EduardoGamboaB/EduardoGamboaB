import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from '../config/index.js';
import { attachAuth } from '../auth/middleware.js';
import { errorHandler, notFound } from './errors.js';

/**
 * Fábrica de app Express con la configuración común de todos los servicios:
 * seguridad (helmet), CORS, logging, parseo JSON, auth opcional y healthchecks.
 */
export function createServer({ name = config.service, mountApi } = {}) {
  const app = express();
  if (config.http.trustProxy) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin: config.http.corsOrigins.includes('*') ? true : config.http.corsOrigins,
      credentials: true,
    })
  );
  if (config.env !== 'test') app.use(morgan('tiny'));
  app.use(express.json({ limit: config.http.jsonLimit }));
  app.use(express.urlencoded({ extended: true }));
  app.use(attachAuth);

  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, service: name, ts: new Date().toISOString() })
  );
  app.get('/api/ready', (_req, res) => res.json({ ready: true, service: name }));

  if (typeof mountApi === 'function') mountApi(app);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

/** Arranca el servidor y registra apagado ordenado. */
export function startServer(app, { port = config.port, name = config.service, onClose } = {}) {
  const server = app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[${name}] escuchando en :${port} (${config.env})`);
  });
  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`[${name}] ${signal} recibido, cerrando...`);
    server.close(async () => {
      try {
        if (onClose) await onClose();
      } finally {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}
