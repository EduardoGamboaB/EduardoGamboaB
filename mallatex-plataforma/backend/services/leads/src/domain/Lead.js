import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';
import { INTERESES, FUENTES } from './catalogos.js';

// ---- Normalizadores/validadores de dominio -------------------------
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function clean(v, max = 500) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}
export function normEmail(v) {
  return clean(v, 160).toLowerCase();
}
export function normPhone(v) {
  return clean(v, 40).replace(/[^\d+]/g, '');
}
export const numDigitos = (s) => (String(s).match(/\d/g) || []).length;

/**
 * Lead — raíz de agregado del contexto leads. Persona capturada en un evento.
 * Encapsula la validación de la captura (personal) y del autoregistro público,
 * incluidas las invariantes de consentimiento. El folio se asigna desde fuera
 * (requiere unicidad contra el repositorio).
 */
export class Lead extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.eventId = props.eventId;
    this.folio = props.folio;
    this.nombre = props.nombre;
    this.empresa = props.empresa || '';
    this.estado = props.estado || '';
    this.email = props.email || '';
    this.telefono = props.telefono || '';
    this.cargo = props.cargo || '';
    this.interes = props.interes || '';
    this.volumen = props.volumen || '';
    this.notas = props.notas || '';
    this.consentimiento = props.consentimiento ?? false;
    this.fuente = props.fuente || '';
    this.capturadoPor = props.capturadoPor || '';
    this.metodoCaptura = props.metodoCaptura || 'manual';
    this.tieneFoto = props.tieneFoto ?? false;
    this.aceptaTerminos = props.aceptaTerminos ?? null;
    this.aceptaPrivacidad = props.aceptaPrivacidad ?? null;
    this.consentimientoAt = props.consentimientoAt || null;
    this.createdAt = props.createdAt || null;
  }

  /**
   * Captura por el personal (staff). Exige nombre y al menos un canal de
   * contacto (teléfono o correo); si hay correo, debe ser válido.
   * `folio` ya viene resuelto (único) desde la capa de aplicación.
   */
  static capturarPorStaff({ eventId, folio, ...b }) {
    const nombre = clean(b.nombre, 120);
    const email = normEmail(b.email);
    const telefono = normPhone(b.telefono);

    if (!nombre) throw new DomainError('El nombre es obligatorio', { code: 'LEAD_NAME_REQUIRED' });
    if (!telefono && !email) {
      throw new DomainError('Proporciona teléfono o correo', { code: 'LEAD_CONTACT_REQUIRED' });
    }
    if (email && !EMAIL_RE.test(email)) {
      throw new DomainError('Correo no válido', { code: 'LEAD_EMAIL_INVALID' });
    }

    const lead = new Lead({
      eventId,
      folio,
      nombre,
      empresa: clean(b.empresa, 160),
      estado: clean(b.estado, 60),
      email,
      telefono,
      cargo: clean(b.cargo, 120),
      interes: INTERESES.includes(b.interes) ? b.interes : clean(b.interes, 120),
      volumen: clean(b.volumen, 120),
      notas: clean(b.notas, 1000),
      consentimiento: Boolean(b.consentimiento),
      fuente: FUENTES.includes(b.fuente) ? b.fuente : clean(b.fuente, 60) || 'Stand',
      capturadoPor: clean(b.capturadoPor, 80),
      metodoCaptura: b.metodoCaptura === 'gafete' ? 'gafete' : 'manual',
    });
    lead.addDomainEvent(new DomainEvent('LeadCaptured', { folio, eventId }));
    return lead;
  }

  /**
   * Autoregistro del visitante desde la landing (público). Más estricto: exige
   * correo válido, celular de EXACTAMENTE 10 dígitos y aceptación de términos y
   * aviso de privacidad (así se puede contactar al ganador). El consentimiento
   * queda registrado con su marca de tiempo.
   */
  static autoregistro({ eventId, folio, ...b }) {
    const nombre = clean(b.nombre, 120);
    const email = normEmail(b.email);
    const telefono = normPhone(b.telefono);

    if (!nombre) throw new DomainError('Escribe tu nombre completo', { code: 'LEAD_NAME_REQUIRED' });
    if (!email || !EMAIL_RE.test(email)) {
      throw new DomainError('Ingresa un correo empresarial válido', { code: 'LEAD_EMAIL_INVALID' });
    }
    if (!telefono || numDigitos(telefono) !== 10) {
      throw new DomainError('El celular debe tener exactamente 10 dígitos', { code: 'LEAD_PHONE_INVALID' });
    }
    if (!b.aceptaTerminos || !b.aceptaPrivacidad) {
      throw new DomainError('Debes aceptar los términos y el aviso de privacidad', {
        code: 'LEAD_CONSENT_REQUIRED',
      });
    }

    const lead = new Lead({
      eventId,
      folio,
      nombre,
      empresa: clean(b.empresa, 160),
      estado: clean(b.estado, 60),
      email,
      telefono,
      cargo: '',
      interes: INTERESES.includes(b.interes) ? b.interes : clean(b.interes, 120),
      volumen: '',
      notas: '',
      consentimiento: true,
      aceptaTerminos: true,
      aceptaPrivacidad: true,
      consentimientoAt: new Date(),
      fuente: 'Autoregistro (QR)',
      capturadoPor: '',
      metodoCaptura: b.metodoCaptura === 'gafete' ? 'gafete' : 'autoregistro',
    });
    lead.addDomainEvent(new DomainEvent('LeadSelfRegistered', { folio, eventId }));
    return lead;
  }

  toPlain() {
    return {
      id: this.id,
      eventId: this.eventId,
      folio: this.folio,
      nombre: this.nombre,
      empresa: this.empresa,
      estado: this.estado,
      email: this.email,
      telefono: this.telefono,
      cargo: this.cargo,
      interes: this.interes,
      volumen: this.volumen,
      notas: this.notas,
      consentimiento: this.consentimiento,
      fuente: this.fuente,
      capturadoPor: this.capturadoPor,
      metodoCaptura: this.metodoCaptura,
      tieneFoto: this.tieneFoto,
      aceptaTerminos: this.aceptaTerminos,
      aceptaPrivacidad: this.aceptaPrivacidad,
      consentimientoAt: this.consentimientoAt,
      createdAt: this.createdAt,
    };
  }
}
