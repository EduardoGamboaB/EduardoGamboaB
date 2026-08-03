import { config } from '@mallatex/shared/config';

/**
 * Mapa de enrutamiento del gateway: prefijo de ruta -> microservicio destino.
 * Cada bounded context expone su API bajo /api/* y el gateway la unifica en
 * un único origen para web y móvil.
 */
export const routeMap = [
  { prefixes: ['/api/auth', '/api/users', '/api/access'], target: config.gateway.identityUrl, name: 'identity' },
  {
    prefixes: [
      '/api/employees', '/api/schedules', '/api/devices', '/api/sites',
      '/api/checadas', '/api/attendance', '/api/incidents', '/api/overtime',
      '/api/periods', '/api/dashboard', '/api/variable-concepts',
      '/api/variable-entries', '/api/variable-sync', '/api/rh',
      '/api/portal', '/api/field', '/api/kiosk',
    ],
    target: config.gateway.attendanceUrl,
    name: 'attendance',
  },
  { prefixes: ['/api/crm', '/api/sales', '/api/products', '/api/integrations'], target: config.gateway.crmUrl, name: 'crm' },
  { prefixes: ['/api/mes'], target: config.gateway.mesUrl, name: 'mes' },
  { prefixes: ['/api/events', '/api/leads', '/api/raffle', '/api/stats'], target: config.gateway.leadsUrl, name: 'leads' },
];
