import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de tickets de RH (autoservicio del empleado <-> RH). */
export class TicketDAO extends BaseDAO {}

/** DAO de bitácora de auditoría. */
export class AuditLogDAO extends BaseDAO {
  /** Registra una acción. Nunca lanza: la auditoría no debe romper el flujo. */
  async record(entry) {
    try {
      return await this.create({ ts: new Date(), ...entry });
    } catch {
      return null;
    }
  }
}
