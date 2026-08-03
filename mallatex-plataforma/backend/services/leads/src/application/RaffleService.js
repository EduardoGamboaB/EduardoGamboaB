import { DomainError } from '@mallatex/shared/ddd';
import { Raffle } from '../domain/Raffle.js';
import { generarFolio } from '../domain/folio.js';

/**
 * RaffleService — casos de uso del sorteo. Reúne los datos (leads y sorteos),
 * delega la elegibilidad y selección al servicio de dominio Raffle, persiste el
 * ganador y notifica por correo (best-effort).
 */
export class RaffleService {
  constructor({ leadDAO, drawDAO, eventService, mailer }) {
    this.leadDAO = leadDAO;
    this.drawDAO = drawDAO;
    this.eventService = eventService;
    this.mailer = mailer;
  }

  /** Cuántos participan (por evento vigente). */
  async eligible({ event, consentimiento, repetidos } = {}) {
    const ev = await this.eventService.resolverVigente(event);
    if (!ev) {
      return {
        eventId: null,
        vigente: false,
        total: 0,
        leadsTotales: 0,
        ganadores: 0,
        correoActivo: this.mailer.enabled(),
        correoProveedor: this.mailer.provider(),
      };
    }
    const soloConsentimiento = consentimiento === '1';
    const evitarRepetidos = repetidos !== '0';
    const [leads, draws] = await Promise.all([this.leadDAO.todos(), this.drawDAO.todos()]);
    const pool = Raffle.elegibles(leads, draws, ev, { soloConsentimiento, evitarRepetidos });
    return {
      eventId: ev.id,
      vigente: true,
      total: pool.length,
      leadsTotales: leads.filter((l) => String(l.eventId) === String(ev.id)).length,
      ganadores: draws.filter((d) => String(d.eventId) === String(ev.id)).length,
      permiteGanadoresPrevios: ev.permiteGanadoresPrevios,
      correoActivo: this.mailer.enabled(),
      correoProveedor: this.mailer.provider(),
    };
  }

  /** Realiza un sorteo, registra el folio del ganador y notifica por correo. */
  async draw(body = {}) {
    const ev = await this.eventService.resolverVigente(body.event);
    if (!ev) {
      throw new DomainError(
        'No hay un evento activo para sortear. Selecciona o activa un evento vigente (no finalizado).',
        { code: 'RAFFLE_NO_EVENT' }
      );
    }
    const premio = (body.premio || ev.premio || '').toString().trim().slice(0, 120) || 'Premio del evento';
    const soloConsentimiento = Boolean(body.soloConsentimiento);
    const evitarRepetidos = body.evitarRepetidos !== false; // por defecto true

    const [leads, draws] = await Promise.all([this.leadDAO.todos(), this.drawDAO.todos()]);
    const pool = Raffle.elegibles(leads, draws, ev, { soloConsentimiento, evitarRepetidos });
    const ganador = Raffle.sortear(pool);
    if (!ganador) throw new DomainError('No hay leads elegibles para el sorteo', { code: 'RAFFLE_EMPTY' });

    // Notificación best-effort; el folio queda registrado pase lo que pase.
    const r = await this.mailer.sendWinnerEmail({
      to: ganador.email,
      nombre: ganador.nombre,
      premio,
      folio: ganador.folio,
      evento: ev.name,
    });

    const draw = await this.drawDAO.create({
      eventId: ev.id,
      premio,
      folio: ganador.folio || generarFolio(),
      leadId: ganador.id,
      nombre: ganador.nombre,
      empresa: ganador.empresa,
      telefono: ganador.telefono,
      email: ganador.email,
      participantes: pool.length,
      emailEnviado: !!r.sent,
      emailEstado: r.sent ? 'enviado' : r.skipped ? 'omitido' : 'error',
    });
    return { ganador: draw };
  }

  /** Historial de ganadores (del evento). */
  async winners({ event } = {}) {
    const ev = await this.eventService.resolver(event);
    const items = ev ? await this.drawDAO.porEvento(ev.id) : [];
    return { items };
  }

  /** Reenvía el correo al ganador. */
  async resend(id) {
    const d = await this.drawDAO.findById(id);
    if (!d) throw new DomainError('Sorteo no encontrado', { code: 'DRAW_NOT_FOUND', status: 404 });
    const ev = await this.eventService.resolver(d.eventId);
    const r = await this.mailer.sendWinnerEmail({
      to: d.email,
      nombre: d.nombre,
      premio: d.premio,
      folio: d.folio,
      evento: ev ? ev.name : '',
    });
    const emailEstado = r.sent ? 'enviado' : r.skipped ? 'omitido' : 'error';
    await this.drawDAO.update(id, { emailEnviado: !!r.sent, emailEstado });
    return { ok: true, estado: emailEstado };
  }

  /** Anula un sorteo (permite repetir). */
  async deleteWinner(id) {
    const d = await this.drawDAO.findById(id);
    if (!d) throw new DomainError('Sorteo no encontrado', { code: 'DRAW_NOT_FOUND', status: 404 });
    await this.drawDAO.delete(id);
    return { ok: true };
  }

  /** Envía un correo de prueba para verificar la integración. */
  async testMail({ to } = {}) {
    if (!this.mailer.enabled()) {
      throw new DomainError('El envío de correo no está configurado (Mailchimp/SMTP).', {
        code: 'MAIL_DISABLED',
      });
    }
    const dest = (to || '').toString().trim();
    if (!dest) throw new DomainError('Indica un correo destino', { code: 'MAIL_NO_DEST' });
    const r = await this.mailer.sendTestEmail(dest);
    if (r.sent) return { ok: true, to: dest, proveedor: this.mailer.provider() };
    throw new DomainError(r.error || 'No se pudo enviar el correo de prueba', {
      code: 'MAIL_SEND_FAILED',
      status: 502,
      details: { skipped: !!r.skipped },
    });
  }
}
