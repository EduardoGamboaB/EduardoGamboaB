import { BaseDAO } from '@mallatex/shared/persistence';
import { User } from '../domain/User.js';

/** DAO de usuarios: mapea filas ORM <-> agregado User. */
export class UserDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    const p = row.get({ plain: true });
    return new User(p);
  }

  toPersistence(entity) {
    const plain = entity instanceof User ? entity.toPlain() : { ...entity };
    // La tabla usa BIGSERIAL: si el id es el UUID que asigna el kernel de dominio
    // (no numérico), se omite para que la base genere el identificador.
    if (plain.id != null && !/^\d+$/.test(String(plain.id))) delete plain.id;
    return plain;
  }

  findByEmail(email) {
    return this.findOne({ email: String(email).toLowerCase() });
  }
}
