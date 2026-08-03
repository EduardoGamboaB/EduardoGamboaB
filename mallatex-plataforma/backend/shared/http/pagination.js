/**
 * Paginación retro-compatible para endpoints de listado.
 *
 * Modo lista plana (sin ?page): la respuesta conserva su forma actual (arreglo)
 * pero se acota con un tope duro (PLAIN_LIMIT) para no volcar filas sin límite.
 * Modo paginado (?page=N[&pageSize=M]): la respuesta pasa a ser
 * { items, total, page, pageSize, pages } vía BaseDAO.paginate, con el mismo
 * shape de item y los mismos filtros del endpoint.
 */

/** Tope duro de filas del modo lista plana (sin ?page). */
export const PLAIN_LIMIT = 500;

/** ¿La petición pide modo paginado? (presencia de ?page=N). */
export function wantsPage(query = {}) {
  return query.page !== undefined && query.page !== null && query.page !== '';
}

/** Normaliza page/pageSize de la query (default 25, máximo 200). */
export function pageOpts(query = {}, { defaultSize = 25, maxSize = 200 } = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || defaultSize, 1), maxSize);
  return { page, pageSize };
}

/** Aplica el mismo post-proceso de items a un resultado paginado. */
export function mapItems(result, fn) {
  return { ...result, items: result.items.map(fn) };
}

/**
 * Pagina en memoria una lista ya filtrada (para filtros que no se trasladan
 * a SQL, p. ej. búsqueda libre). Devuelve el mismo shape que BaseDAO.paginate.
 */
export function paginateArray(list, { page, pageSize }) {
  const start = (page - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
    pages: Math.ceil(list.length / pageSize),
  };
}
