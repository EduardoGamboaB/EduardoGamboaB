import { DomainError } from '@mallatex/shared/ddd';
import { Lead, normEmail, normPhone } from '../domain/Lead.js';
import { generarFolioUnico } from '../domain/folio.js';
import { INTERESES, FUENTES } from '../domain/catalogos.js';
import { decodeImage } from '../infrastructure/images.js';

const badgeKey = (id) => 'badge:' + id;

/**
 * LeadService — casos de uso de captura y consulta de leads. Aplica la
 * detección de duplicados, el folio único y el guardado de la foto de gafete
 * como blob (fuera del JSON).
 */
export class LeadService {
  constructor({ leadDAO, eventService, blobDAO }) {
    this.leadDAO = leadDAO;
    this.eventService = eventService;
    this.blobDAO = blobDAO;
  }

  /** Catálogos para el formulario (público). */
  async meta() {
    const ev = await this.eventService.resolver();
    return {
      intereses: INTERESES,
      fuentes: FUENTES,
      event: ev ? { id: ev.id, name: ev.name } : null,
    };
  }

  /**
   * Captura por el personal (staff). Detecta duplicados por correo/teléfono
   * dentro del evento: lanza LEAD_DUPLICATE (409) salvo que `forzar` sea true.
   */
  async capturar(body = {}, { forzar = false } = {}) {
    const ev = await this.#eventoObjetivo(body);
    const email = normEmail(body.email);
    const telefono = normPhone(body.telefono);

    if (!forzar) {
      const dup = await this.leadDAO.duplicado(ev.id, email, telefono);
      if (dup) {
        throw new DomainError('Ya existe un lead con ese correo o teléfono en este evento', {
          code: 'LEAD_DUPLICATE',
          status: 409,
          details: { duplicado: { id: dup.id, nombre: dup.nombre } },
        });
      }
    }

    const folio = await generarFolioUnico((f) => this.leadDAO.folioExiste(f));
    const lead = Lead.capturarPorStaff({ eventId: ev.id, folio, ...body });
    const saved = await this.leadDAO.create(lead);
    saved.tieneFoto = await this.#guardarFoto(saved.id, body.foto);
    if (saved.tieneFoto) await this.leadDAO.update(saved.id, { tieneFoto: true });
    return saved.toPlain();
  }

  /**
   * Autoregistro del visitante (público). Si ya está registrado en el evento,
   * responde de forma amistosa (yaRegistrado) en lugar de error.
   */
  async autoregistro(body = {}) {
    // Honeypot anti-bots: campo oculto que un humano no llena.
    if (body.website) throw new DomainError('Solicitud inválida', { code: 'LEAD_HONEYPOT' });

    const ev = await this.#eventoObjetivo(body);
    const email = normEmail(body.email);
    const telefono = normPhone(body.telefono);

    const dup = await this.leadDAO.duplicado(ev.id, email, telefono);
    if (dup) return { ok: true, yaRegistrado: true, folio: dup.folio || '' };

    const folio = await generarFolioUnico((f) => this.leadDAO.folioExiste(f));
    const lead = Lead.autoregistro({ eventId: ev.id, folio, ...body });
    const saved = await this.leadDAO.create(lead);
    try {
      saved.tieneFoto = await this.#guardarFoto(saved.id, body.foto);
      if (saved.tieneFoto) await this.leadDAO.update(saved.id, { tieneFoto: true });
    } catch {
      // La foto es opcional: no bloquea el autoregistro.
    }
    return { ok: true, folio: saved.folio };
  }

  /** Listado con búsqueda y filtros (opcionalmente por evento). */
  async listar({ q, interes, fuente, event } = {}) {
    const where = {};
    if (event) where.eventId = event;
    if (interes) where.interes = interes;
    if (fuente) where.fuente = fuente;
    let items = await this.leadDAO.findAll(where, { order: [['created_at', 'DESC']] });
    if (q) {
      const needle = String(q).toLowerCase();
      items = items.filter((l) =>
        [l.nombre, l.empresa, l.email, l.telefono, l.cargo].join(' ').toLowerCase().includes(needle)
      );
    }
    return { total: items.length, items: items.map((l) => l.toPlain()) };
  }

  /** Genera el CSV de exportación (opcionalmente por evento). */
  async exportCsv(eventId) {
    const cols = [
      'folio', 'evento', 'nombre', 'empresa', 'estado', 'cargo', 'email', 'telefono',
      'interes', 'volumen', 'fuente', 'metodoCaptura', 'consentimiento', 'capturadoPor', 'createdAt',
    ];
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const leads = eventId ? await this.leadDAO.porEvento(eventId) : await this.leadDAO.todos();

    // Nombres de evento (caché para no reconsultar por cada fila).
    const nombres = new Map();
    const nombreEvento = async (id) => {
      if (nombres.has(id)) return nombres.get(id);
      const e = await this.eventService.eventDAO.findById(id);
      const n = e ? e.name : '';
      nombres.set(id, n);
      return n;
    };

    const rows = [cols.join(',')];
    for (const l of leads) {
      const p = l.toPlain();
      p.evento = await nombreEvento(p.eventId);
      rows.push(cols.map((c) => esc(p[c])).join(','));
    }
    // BOM para que Excel respete UTF-8.
    return '﻿' + rows.join('\r\n');
  }

  /** Foto del gafete (blob). Devuelve { mime, data } o null. */
  badge(id) {
    return this.blobDAO.get(badgeKey(id));
  }

  async eliminar(id) {
    const lead = await this.leadDAO.findById(id);
    if (!lead) throw new DomainError('Lead no encontrado', { code: 'LEAD_NOT_FOUND', status: 404 });
    await this.leadDAO.delete(id);
    await this.blobDAO.del(badgeKey(id));
    return { ok: true };
  }

  // ---- Auxiliares ----------------------------------------------------
  async #eventoObjetivo(body) {
    const ev = await this.eventService.resolver(body.event);
    if (!ev) throw new DomainError('No hay un evento disponible', { code: 'EVENT_NONE', status: 400 });
    return ev;
  }

  async #guardarFoto(id, dataUrl) {
    const img = decodeImage(dataUrl);
    if (!img) return false;
    await this.blobDAO.put(badgeKey(id), img.buffer, img.mime);
    return true;
  }
}
