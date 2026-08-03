import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de periodos de nómina. */
export class PeriodDAO extends BaseDAO {
  openOrLatest() {
    return this.findOne({ status: 'abierto' }, { order: [['start_date', 'DESC']] });
  }
}

/** DAO del catálogo de conceptos NOI. */
export class NoiConceptDAO extends BaseDAO {}

/** DAO del catálogo de conceptos de percepción variable. */
export class VariableConceptDAO extends BaseDAO {}

/** DAO de capturas de percepción variable por periodo. */
export class VariableEntryDAO extends BaseDAO {}

/** DAO de recibos preliminares. */
export class PayslipDAO extends BaseDAO {}
