import { AccessPolicy } from '../domain/AccessPolicy.js';

/**
 * AccessService — casos de uso de la matriz de acceso y resolución de módulos
 * efectivos por sujeto (usuario admin o empleado) y superficie.
 */
export class AccessService {
  constructor({ moduleDAO, accessGrantDAO }) {
    this.moduleDAO = moduleDAO;
    this.accessGrantDAO = accessGrantDAO;
  }

  async catalog(surface) {
    const mods = await this.moduleDAO.bySurface(surface);
    return mods.map((m) => ({ key: m.key, grp: m.grp, label: m.label, sort: m.sort }));
  }

  async allModuleKeys(surface) {
    const mods = await this.moduleDAO.bySurface(surface);
    return mods.map((m) => m.key);
  }

  /** Módulos efectivos de un usuario administrativo en la superficie web. */
  async webModulesForUser(user) {
    const [base, all] = await Promise.all([
      this.accessGrantDAO.modulesFor('role', user.role, 'web'),
      this.allModuleKeys('web'),
    ]);
    return AccessPolicy.effectiveModules({
      baseModules: base,
      extra: user.extraModules,
      revoked: user.revokedModules,
      isAdmin: user.role === 'admin',
      allModules: all,
    });
  }

  /** Módulos efectivos de un empleado en una superficie (mobile|portal). */
  async modulesForEmployee(employee, surface) {
    const profile = employee.appProfile || 'operativo';
    const base = await this.accessGrantDAO.modulesFor('profile', profile, surface);
    const extra = surface === 'portal' ? employee.portalExtraModules : employee.extraModules;
    const revoked = surface === 'portal' ? employee.portalRevokedModules : employee.revokedModules;
    return AccessPolicy.effectiveModules({
      baseModules: base,
      extra: extra || [],
      revoked: revoked || [],
      isAdmin: false,
      allModules: [],
    });
  }

  /** Devuelve la matriz completa (para las pantallas de configuración). */
  async getMatrix() {
    const [web, mobile, portal] = await Promise.all([
      this.moduleDAO.bySurface('web'),
      this.moduleDAO.bySurface('mobile'),
      this.moduleDAO.bySurface('portal'),
    ]);
    const grants = await this.accessGrantDAO.findAll();
    return {
      catalog: { web, mobile, portal },
      grants: grants.map((g) => ({
        subjectType: g.subjectType,
        subjectKey: g.subjectKey,
        surface: g.surface,
        moduleKey: g.moduleKey,
      })),
    };
  }

  async setGrants(subjectType, subjectKey, surface, moduleKeys) {
    await this.accessGrantDAO.setModules(subjectType, subjectKey, surface, moduleKeys);
    return { subjectType, subjectKey, surface, moduleKeys };
  }
}
