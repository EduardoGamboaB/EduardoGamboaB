import { BaseDAO } from '@mallatex/shared/persistence';

/**
 * DAOs de registros administrativos del CRM (objetivos, viáticos, gastos y
 * facturas). Devuelven registros planos; los importes NUMERIC se coercionan a
 * número donde se opera aritméticamente en la capa de aplicación.
 */

export class ObjectiveDAO extends BaseDAO {
  /** Objetivos de un vendedor, del periodo más reciente al más antiguo. */
  forEmployee(employeeId) {
    return this.findAll({ employeeId: Number(employeeId) }, { order: [['period', 'DESC']] });
  }
}

export class ExpenseRequestDAO extends BaseDAO {}

export class ExpenseDAO extends BaseDAO {}

export class InvoiceDAO extends BaseDAO {
  findByFolio(folio) {
    return this.findOne({ folio });
  }

  findByUuid(uuid) {
    return this.findOne({ uuid });
  }
}

/** Lectura de empleados (attendance) para enriquecer nombres y validar. */
export class EmployeeReadDAO extends BaseDAO {}
