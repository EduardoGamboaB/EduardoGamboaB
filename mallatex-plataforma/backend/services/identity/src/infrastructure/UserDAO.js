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
    if (entity instanceof User) return entity.toPlain();
    return entity;
  }

  findByEmail(email) {
    return this.findOne({ email: String(email).toLowerCase() });
  }
}
