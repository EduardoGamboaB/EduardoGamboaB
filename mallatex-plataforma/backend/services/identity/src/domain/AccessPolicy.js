/**
 * AccessPolicy — servicio de dominio que calcula los módulos EFECTIVOS de un
 * sujeto a partir de la matriz base (rol/perfil -> módulos) más las
 * concesiones/revocaciones individuales. Es la única fuente de verdad de acceso
 * y alimenta tanto el menú web/portal como el móvil.
 */
export class AccessPolicy {
  /**
   * @param {string[]} baseModules  módulos otorgados por el rol/perfil
   * @param {string[]} extra        módulos concedidos al sujeto
   * @param {string[]} revoked      módulos revocados al sujeto
   * @param {boolean}  isAdmin      admin siempre tiene todo
   * @param {string[]} allModules   universo de módulos de la superficie
   */
  static effectiveModules({ baseModules = [], extra = [], revoked = [], isAdmin = false, allModules = [] }) {
    if (isAdmin) return [...allModules];
    const set = new Set(baseModules);
    for (const m of extra) set.add(m);
    for (const m of revoked) set.delete(m);
    return [...set];
  }
}
