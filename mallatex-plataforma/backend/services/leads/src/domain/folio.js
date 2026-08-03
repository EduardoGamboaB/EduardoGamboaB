/**
 * Generación del folio legible del lead (ANB-XXXXXX).
 *
 * Es el identificador que ve/presenta el visitante; si resulta ganador del
 * sorteo se reutiliza este mismo folio. Se usa un alfabeto NO ambiguo (sin
 * O/0, I/1, etc.) para que sea fácil de dictar y teclear en el stand.
 */

// Alfabeto sin caracteres ambiguos (se omiten 0,1,O,I,etc.).
export const ALFABETO_FOLIO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Genera un folio candidato ANB-XXXXXX (6 caracteres del alfabeto seguro). */
export function generarFolio() {
  let s = '';
  for (let i = 0; i < 6; i++) {
    s += ALFABETO_FOLIO[Math.floor(Math.random() * ALFABETO_FOLIO.length)];
  }
  return 'ANB-' + s;
}

/**
 * Genera un folio único apoyándose en un predicado async `existe(folio)`.
 * Reintenta hasta 20 veces; como último recurso deriva uno del timestamp para
 * garantizar que la captura nunca se bloquee por colisiones.
 */
export async function generarFolioUnico(existe) {
  for (let intento = 0; intento < 20; intento++) {
    const folio = generarFolio();
    // eslint-disable-next-line no-await-in-loop
    if (!(await existe(folio))) return folio;
  }
  return 'ANB-' + Date.now().toString(36).toUpperCase().slice(-6);
}
