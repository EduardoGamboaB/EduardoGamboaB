import { BaseDAO } from '@mallatex/shared/persistence';
import { Employee } from '../domain/Employee.js';

/** DAO de empleados: mapea filas ORM <-> agregado Employee. */
export class EmployeeDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    const p = row.get({ plain: true });
    return new Employee(p);
  }

  toPersistence(entity) {
    if (entity instanceof Employee) {
      const p = entity.toPlain();
      // El agregado hereda un id autogenerado (UUID) cuando es nuevo; se omite
      // para que la columna BIGINT lo asigne por autoincremento. Sólo se envía
      // el id si ya es un identificador numérico persistido.
      if (p.id == null || !Number.isFinite(Number(p.id))) delete p.id;
      return p;
    }
    return entity;
  }

  findByCode(code) {
    return this.findOne({ code: String(code).toUpperCase() });
  }

  active(where = {}) {
    return this.findAll({ active: true, ...where }, { order: [['name', 'ASC']] });
  }
}
