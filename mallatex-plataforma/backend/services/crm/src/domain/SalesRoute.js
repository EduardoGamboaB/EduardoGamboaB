import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

/**
 * SalesRoute — recorrido de ruta de un vendedor. Encapsula el estado (activa|
 * finalizada), el track GPS (apto para captura por lotes/offline) y los
 * clientes planeados. Invariante: sólo puede rastrearse mientras esté activa.
 */
export class SalesRoute extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.employeeId = Number(props.employeeId);
    this.date = props.date || null;
    this.status = props.status || 'activa';
    this.startedAt = props.startedAt || null;
    this.endedAt = props.endedAt || null;
    this.plannedClientIds = props.plannedClientIds || [];
    this.track = props.track || [];
  }

  static start({ employeeId, plannedClientIds, lat, lng }) {
    const now = new Date().toISOString();
    const track = lat != null && lng != null ? [{ lat: Number(lat), lng: Number(lng), ts: now }] : [];
    const route = new SalesRoute({
      employeeId,
      date: now.slice(0, 10),
      status: 'activa',
      startedAt: now,
      endedAt: null,
      plannedClientIds: Array.isArray(plannedClientIds) ? plannedClientIds.map(Number) : [],
      track,
    });
    route.addDomainEvent(new DomainEvent('RouteStarted', { employeeId: route.employeeId }));
    return route;
  }

  get isActive() {
    return this.status === 'activa';
  }

  /** Agrega puntos GPS al recorrido (por lotes). Sólo si la ruta está activa. */
  addTrack(rawPoints) {
    if (!this.isActive) throw new DomainError('La ruta ya está finalizada', { code: 'ROUTE_CLOSED', status: 409 });
    const now = new Date().toISOString();
    const clean = (rawPoints || [])
      .filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)))
      .map((p) => ({ lat: Number(p.lat), lng: Number(p.lng), ts: p.ts || now }));
    this.track = [...this.track, ...clean];
    return clean.length;
  }

  /** Finaliza la ruta. */
  end() {
    this.status = 'finalizada';
    this.endedAt = new Date().toISOString();
    this.addDomainEvent(new DomainEvent('RouteEnded', { routeId: this.id, points: this.track.length }));
  }

  toPlain() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      date: this.date,
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      plannedClientIds: this.plannedClientIds,
      track: this.track,
    };
  }
}
