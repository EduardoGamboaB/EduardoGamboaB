import { getSequelize } from '@mallatex/shared/persistence';

/**
 * Tokens push de los colaboradores activos.
 *
 * Lectura cruzada de esquema (attendance.employees) desde marketing: es una
 * consulta de SOLO LECTURA sobre la misma base, aceptada como pragmatismo
 * mientras no exista el bus de eventos distribuido (excluido del alcance por
 * decisión de negocio). Si la consulta falla (p. ej. sqlite en pruebas sin el
 * esquema attendance), devuelve lista vacía: el push es best-effort.
 */
export async function activePushTokens() {
  try {
    const sequelize = getSequelize();
    const [rows] = await sequelize.query(
      "SELECT push_token FROM attendance.employees WHERE active = TRUE AND push_token IS NOT NULL"
    );
    return rows.map((r) => r.push_token).filter(Boolean);
  } catch {
    return [];
  }
}
