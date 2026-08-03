import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO del catálogo de módulos. */
export class ModuleDAO extends BaseDAO {
  bySurface(surface) {
    return this.findAll({ surface }, { order: [['sort', 'ASC']] });
  }
}

/** DAO de la matriz de acceso (concesiones rol/perfil -> módulo). */
export class AccessGrantDAO extends BaseDAO {
  async modulesFor(subjectType, subjectKey, surface) {
    const rows = await this.findAll({ subjectType, subjectKey, surface });
    return rows.map((r) => r.moduleKey);
  }

  async setModules(subjectType, subjectKey, surface, moduleKeys, tx) {
    await this.deleteWhere({ subjectType, subjectKey, surface }, { transaction: tx });
    if (moduleKeys.length) {
      await this.bulkCreate(
        moduleKeys.map((moduleKey) => ({ subjectType, subjectKey, surface, moduleKey })),
        { transaction: tx, ignoreDuplicates: true }
      );
    }
  }
}
