#!/usr/bin/env node
/**
 * Orquestador de desarrollo: arranca el gateway y los 5 microservicios en un
 * solo comando (`npm run dev`). Cada uno hereda el entorno (DATABASE_URL, etc.).
 * Para producción se usan procesos/containers independientes (ver deploy/).
 */
import { spawn } from 'node:child_process';

const services = [
  { name: 'identity', ws: '@mallatex/service-identity', port: 3001, color: '\x1b[36m' },
  { name: 'attendance', ws: '@mallatex/service-attendance', port: 3002, color: '\x1b[32m' },
  { name: 'crm', ws: '@mallatex/service-crm', port: 3003, color: '\x1b[33m' },
  { name: 'mes', ws: '@mallatex/service-mes', port: 3004, color: '\x1b[35m' },
  { name: 'leads', ws: '@mallatex/service-leads', port: 3005, color: '\x1b[34m' },
  { name: 'gateway', ws: '@mallatex/gateway', port: 3000, color: '\x1b[31m' },
];
const RESET = '\x1b[0m';

const children = [];
for (const s of services) {
  const child = spawn('npm', ['--workspace', s.ws, 'run', 'start'], {
    env: { ...process.env, PORT: String(s.port), SERVICE_NAME: s.name },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tag = `${s.color}[${s.name}:${s.port}]${RESET}`;
  const pipe = (stream, isErr) =>
    stream.on('data', (d) =>
      String(d)
        .split('\n')
        .filter(Boolean)
        .forEach((line) => (isErr ? process.stderr : process.stdout).write(`${tag} ${line}\n`))
    );
  pipe(child.stdout, false);
  pipe(child.stderr, true);
  children.push(child);
}

const stop = () => {
  children.forEach((c) => c.kill('SIGTERM'));
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
// eslint-disable-next-line no-console
console.log('▶ Plataforma Mallatex en desarrollo — gateway http://localhost:3000');
