import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

const VISIT_STATUS = ['realizada', 'no_localizado', 'reagendada'];
const VISIT_TYPE = ['prospeccion', 'seguimiento', 'cierre', 'cobranza', 'entrega', 'postventa'];

/**
 * Visit — visita de un vendedor a un cliente, con evidencia (fotos), GPS y
 * clasificación (tipo/estatus). Apta para captura offline y ligada a una ruta.
 */
export class Visit extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.employeeId = Number(props.employeeId);
    this.clientId = props.clientId != null ? Number(props.clientId) : null;
    this.routeId = props.routeId != null ? Number(props.routeId) : null;
    this.ts = props.ts || null;
    this.lat = props.lat != null ? Number(props.lat) : null;
    this.lng = props.lng != null ? Number(props.lng) : null;
    this.found = props.found ?? null;
    this.status = props.status || null;
    this.type = props.type || null;
    this.notes = props.notes || '';
    this.photos = props.photos || [];
    this.offline = props.offline ?? false;
  }

  static create(props) {
    if (props.clientId == null) throw new DomainError('clientId es obligatorio', { code: 'VISIT_CLIENT_REQUIRED' });
    const status = VISIT_STATUS.includes(props.status) ? props.status : 'realizada';
    const type = VISIT_TYPE.includes(props.type) ? props.type : 'seguimiento';
    const visit = new Visit({
      ...props,
      status,
      type,
      found: props.found === true,
      offline: props.offline === true,
      photos: Array.isArray(props.photos) ? props.photos.slice(0, 5) : [],
      ts: props.ts || new Date().toISOString(),
    });
    visit.addDomainEvent(new DomainEvent('VisitRegistered', { clientId: visit.clientId, type, status }));
    return visit;
  }

  toPlain() {
    return {
      id: this.id,
      employeeId: this.employeeId,
      clientId: this.clientId,
      routeId: this.routeId,
      ts: this.ts,
      lat: this.lat,
      lng: this.lng,
      found: this.found,
      status: this.status,
      type: this.type,
      notes: this.notes,
      photos: this.photos,
      offline: this.offline,
    };
  }
}

export { VISIT_STATUS, VISIT_TYPE };
