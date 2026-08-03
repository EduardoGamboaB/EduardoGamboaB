import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

/** Limpia un texto: recorta espacios y trunca a `max` caracteres. */
function clean(v, max = 2000) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

/**
 * Event — raíz de agregado del contexto leads. Representa un evento/expo con su
 * premio, dinámica y ventana de contacto. Encapsula las transiciones de estado
 * (finalizar/reabrir/activar); la invariante "un solo evento activo a la vez"
 * se coordina en la capa de aplicación (afecta a otros agregados).
 */
export class Event extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.name = props.name || 'Evento';
    this.edition = props.edition || '';
    this.tipo = props.tipo || '';
    this.premio = props.premio || '';
    this.premioImagen = props.premioImagen ?? false;
    this.dinamica = props.dinamica || '';
    this.fecha = props.fecha || null;
    this.hora = props.hora || null;
    this.lugar = props.lugar || '';
    this.plazoContactoDias = props.plazoContactoDias ?? 30;
    this.permiteGanadoresPrevios = props.permiteGanadoresPrevios ?? true;
    this.finalizado = props.finalizado ?? false;
    this.activo = props.activo ?? false;
    this.createdAt = props.createdAt || null;
  }

  static create(props) {
    const name = clean(props.name, 120);
    if (!name) throw new DomainError('El nombre del evento es obligatorio', { code: 'EVENT_NAME_REQUIRED' });
    const ev = new Event({ ...props, name });
    ev.aplicar(props);
    ev.addDomainEvent(new DomainEvent('EventCreated', { name: ev.name }));
    return ev;
  }

  /** Aplica los campos editables del body (validando/normalizando). */
  aplicar(b = {}) {
    if (b.name !== undefined) this.name = clean(b.name, 120) || 'Evento';
    if (b.edition !== undefined) this.edition = clean(b.edition, 40);
    if (b.tipo !== undefined) this.tipo = clean(b.tipo, 80);
    if (b.premio !== undefined) this.premio = clean(b.premio, 300);
    if (b.dinamica !== undefined) this.dinamica = clean(b.dinamica, 2000);
    if (b.fecha !== undefined) this.fecha = clean(b.fecha, 10) || null;
    if (b.hora !== undefined) this.hora = clean(b.hora, 8) || null;
    if (b.lugar !== undefined) this.lugar = clean(b.lugar, 160);
    if (b.plazoContactoDias !== undefined) {
      const n = parseInt(String(b.plazoContactoDias).replace(/\D/g, ''), 10);
      this.plazoContactoDias = Number.isFinite(n) ? n : 30;
    }
    if (b.permiteGanadoresPrevios !== undefined) {
      this.permiteGanadoresPrevios = Boolean(b.permiteGanadoresPrevios);
    }
    if (b.finalizado !== undefined) this.finalizado = Boolean(b.finalizado);
    return this;
  }

  finalizar() {
    this.finalizado = true;
    this.addDomainEvent(new DomainEvent('EventFinalizado', { id: this.id }));
  }

  reabrir() {
    this.finalizado = false;
  }

  activar() {
    this.activo = true;
    this.addDomainEvent(new DomainEvent('EventActivado', { id: this.id }));
  }

  desactivar() {
    this.activo = false;
  }

  /** ¿El evento está vigente para sortear? (existe y no finalizado). */
  get vigente() {
    return !this.finalizado;
  }

  toPlain() {
    return {
      id: this.id,
      name: this.name,
      edition: this.edition,
      tipo: this.tipo,
      premio: this.premio,
      premioImagen: this.premioImagen,
      dinamica: this.dinamica,
      fecha: this.fecha,
      hora: this.hora,
      lugar: this.lugar,
      plazoContactoDias: this.plazoContactoDias,
      permiteGanadoresPrevios: this.permiteGanadoresPrevios,
      finalizado: this.finalizado,
      activo: this.activo,
      createdAt: this.createdAt,
    };
  }

  /** Subconjunto público (landing/términos/QR). Sin banderas internas. */
  toPublic() {
    return {
      id: this.id,
      name: this.name,
      edition: this.edition,
      tipo: this.tipo,
      premio: this.premio,
      dinamica: this.dinamica,
      fecha: this.fecha,
      hora: this.hora,
      lugar: this.lugar,
      plazoContactoDias: this.plazoContactoDias,
      premioImagen: !!this.premioImagen,
    };
  }
}
