// Bitácora / trazabilidad: cada ajuste queda registrado con usuario, fecha y motivo.
import * as db from './db.js';

export function log(req, { action, entity, entityId = null, detail = '' }) {
  const user = req?.user || { id: null, name: 'sistema' };
  return db.insert('audit', {
    timestamp: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    role: user.role || null,
    action,
    entity,
    entityId,
    detail,
  });
}

export function logSystem({ action, entity, entityId = null, detail = '' }) {
  return db.insert('audit', {
    timestamp: new Date().toISOString(),
    userId: null,
    userName: 'sistema',
    role: 'sistema',
    action,
    entity,
    entityId,
    detail,
  });
}
