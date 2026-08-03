import { BaseDAO } from '@mallatex/shared/persistence';

/** DAO de horarios/turnos. */
export class ScheduleDAO extends BaseDAO {}

/** DAO de dispositivos (checador biométrico). */
export class DeviceDAO extends BaseDAO {}

/** DAO de sitios/obras con geocerca. Coacciona lat/lng/radio a número. */
export class SiteDAO extends BaseDAO {
  toDomain(row) {
    if (!row) return null;
    const p = row.get({ plain: true });
    return {
      ...p,
      lat: p.lat == null ? null : Number(p.lat),
      lng: p.lng == null ? null : Number(p.lng),
      radiusMeters: p.radiusMeters == null ? null : Number(p.radiusMeters),
    };
  }
}
