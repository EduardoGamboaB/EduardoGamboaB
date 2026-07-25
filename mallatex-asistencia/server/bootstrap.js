// Inicialización de datos al primer arranque.
//   - Desarrollo (SEED_DEMO=true): carga los datos demostrativos de Mallatex.
//   - Producción (SEED_DEMO=false): crea sólo los catálogos base y el primer
//     administrador a partir de BOOTSTRAP_ADMIN_* (sin empleados ni checadas demo).

import * as db from './db.js';
import { config } from './config.js';
import { hashPassword, ROLES } from './auth.js';
import { defaultNoiConcepts, defaultVariableConcepts } from './noi.js';
import { seed, isEmpty } from './seed.js';
import { logSystem } from './audit.js';

export function initData() {
  if (!isEmpty()) return { skipped: true };
  if (config.seedDemo) return { mode: 'demo', ...seed() };
  return { mode: 'bootstrap', ...bootstrapProduction() };
}

function bootstrapProduction() {
  db.saveSettings({
    company: config.company.name,
    noiCompany: config.company.noiCompany,
    branch: config.company.branch,
    overtimeThresholdMin: 15,
    overtimeMinBlockMin: 30,
    bonusMaxRetardos: 2,
    bonusAllowFaltas: 0,
    earlyLeaveThresholdMin: 10,
    bonusAmount: 300,
  });
  for (const c of defaultNoiConcepts()) db.insert('noiConcepts', c);
  for (const c of defaultVariableConcepts()) db.insert('variableConcepts', c);

  let admin = null;
  const { email, password, name } = config.bootstrapAdmin;
  if (email && password) {
    admin = db.insert('users', {
      name, email, role: ROLES.ADMIN, position: 'Administrador',
      password: hashPassword(password), active: true,
    });
  }
  logSystem({ action: 'bootstrap', entity: 'system', detail: 'Inicialización de producción (catálogos base)' });
  return { admin: admin ? admin.email : null, noiConcepts: db.all('noiConcepts').length };
}
