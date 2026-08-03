import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de checadas crudas. Normaliza lat/lng a número para la geocerca. */
export class ChecadaDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    const p = row.get({ plain: true });
    return {
      ...p,
      lat: p.lat == null ? null : Number(p.lat),
      lng: p.lng == null ? null : Number(p.lng),
    };
  }
}

/** DAO del registro diario de asistencia (attendance_day). */
export class AttendanceDayDAO extends BaseDAO {
  findByEmployeeDate(employeeId, date) {
    return this.findOne({ employeeId, date });
  }
}

/** DAO de incidencias (faltas, vacaciones, permisos, incapacidades…). */
export class IncidentDAO extends BaseDAO {}

/** DAO de tiempo extra. */
export class OvertimeDAO extends BaseDAO {
  findByEmployeeDate(employeeId, date) {
    return this.findOne({ employeeId, date });
  }
}
