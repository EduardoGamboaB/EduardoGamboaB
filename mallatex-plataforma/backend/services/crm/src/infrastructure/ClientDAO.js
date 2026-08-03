import { BaseDAO } from '@mallatex/shared/persistence';
import { Client } from '../domain/Client.js';

/** DAO de clientes: mapea filas ORM <-> agregado Client. */
export class ClientDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    return new Client(row.get({ plain: true }));
  }

  toPersistence(entity) {
    const p = entity instanceof Client ? entity.toPlain() : { ...entity };
    // Agregado nuevo: el id lo asigna la BD (BIGSERIAL); descartamos el UUID
    // que la raíz genera por defecto cuando aún no tiene identidad persistida.
    if (p.id == null || !Number.isFinite(Number(p.id))) delete p.id;
    return p;
  }
}
