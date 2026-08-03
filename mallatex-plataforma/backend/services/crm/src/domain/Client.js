import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

const VALID_TYPES = ['cliente', 'prospecto'];

/**
 * Client — raíz de agregado del contexto crm. Encapsula las invariantes de un
 * cliente/prospecto: nombre obligatorio, tipo válido, asignación a un vendedor
 * y el avance de etapa cuando un prospecto es trabajado en campo.
 */
export class Client extends AggregateRoot {
  constructor(props) {
    super(props.id);
    this.name = props.name;
    this.type = props.type || 'prospecto';
    this.stage = props.stage ?? null;
    this.contactName = props.contactName || '';
    this.phone = props.phone || '';
    this.email = props.email || '';
    this.address = props.address || '';
    this.lat = props.lat != null ? Number(props.lat) : null;
    this.lng = props.lng != null ? Number(props.lng) : null;
    this.cultivo = props.cultivo || '';
    this.assignedTo = props.assignedTo != null ? Number(props.assignedTo) : null;
    this.notes = props.notes || '';
    this.active = props.active ?? true;
    this.createdAt = props.createdAt || null;
  }

  static create(props) {
    if (!props.name) throw new DomainError('El nombre es obligatorio', { code: 'CLIENT_NAME_REQUIRED' });
    const type = VALID_TYPES.includes(props.type) ? props.type : 'prospecto';
    const stage = props.stage || (type === 'prospecto' ? 'prospecto' : 'cliente');
    const client = new Client({ ...props, type, stage });
    client.addDomainEvent(new DomainEvent('ClientCreated', { name: client.name, type: client.type }));
    return client;
  }

  /** Asigna (o reasigna) el cliente a un vendedor (empleado). */
  assignTo(employeeId) {
    this.assignedTo = employeeId != null ? Number(employeeId) : null;
    this.addDomainEvent(new DomainEvent('ClientAssigned', { clientId: this.id, employeeId: this.assignedTo }));
  }

  /** Un prospecto localizado y trabajado en campo avanza a negociación. */
  advanceOnVisit(found) {
    if (this.type === 'prospecto' && found === true && this.stage === 'prospecto') {
      this.stage = 'negociacion';
      return true;
    }
    return false;
  }

  get isProspect() {
    return this.type === 'prospecto';
  }

  toPlain() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      stage: this.stage,
      contactName: this.contactName,
      phone: this.phone,
      email: this.email,
      address: this.address,
      lat: this.lat,
      lng: this.lng,
      cultivo: this.cultivo,
      assignedTo: this.assignedTo,
      notes: this.notes,
      active: this.active,
      createdAt: this.createdAt,
    };
  }
}

export { VALID_TYPES as CLIENT_TYPES };
