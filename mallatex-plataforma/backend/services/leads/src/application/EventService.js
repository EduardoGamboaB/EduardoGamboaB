import { DomainError } from '@mallatex/shared/ddd';
import { Event } from '../domain/Event.js';
import { decodeImage } from '../infrastructure/images.js';

const prizeKey = (id) => 'event:premio:' + id;

/**
 * EventService — casos de uso de administración de eventos. Coordina la
 * invariante "un solo evento activo a la vez" (afecta a varios agregados) y el
 * manejo de la imagen del premio como blob.
 */
export class EventService {
  constructor({ eventDAO, leadDAO, drawDAO, blobDAO }) {
    this.eventDAO = eventDAO;
    this.leadDAO = leadDAO;
    this.drawDAO = drawDAO;
    this.blobDAO = blobDAO;
  }

  /** Resuelve el evento objetivo (id explícito o el activo). */
  async resolver(id) {
    if (id) {
      const ev = await this.eventDAO.findById(id);
      if (ev) return ev;
    }
    return this.eventDAO.activo();
  }

  /** Resuelve un evento vigente (existe y no finalizado) para sortear. */
  async resolverVigente(id) {
    const ev = await this.resolver(id);
    return ev && ev.vigente ? ev : null;
  }

  async listar() {
    const items = await this.eventDAO.listar();
    const activo = await this.eventDAO.activo();
    return { items: items.map((e) => e.toPlain()), activeEventId: activo ? activo.id : null };
  }

  async publicActive() {
    const ev = await this.eventDAO.activo();
    return ev ? ev.toPublic() : null;
  }

  async publicById(id) {
    const ev = await this.eventDAO.findById(id);
    if (!ev) throw new DomainError('Evento no encontrado', { code: 'EVENT_NOT_FOUND', status: 404 });
    return ev.toPublic();
  }

  async premioImagen(id) {
    return this.blobDAO.get(prizeKey(id));
  }

  /**
   * Crea un evento. Se vuelve activo sólo si no hay un activo vigente
   * (no le roba el activo a un evento en curso).
   */
  async crear(body = {}) {
    const ev = Event.create(body);
    const activo = await this.eventDAO.activo();
    if (!activo || activo.finalizado) {
      await this.eventDAO.desactivarTodos();
      ev.activar();
    }
    const saved = await this.eventDAO.create(ev);
    await this.#manejarImagen(saved, body);
    return this.eventDAO.findById(saved.id).then((e) => e.toPlain());
  }

  async actualizar(id, body = {}) {
    const ev = await this.eventDAO.findById(id);
    if (!ev) throw new DomainError('Evento no encontrado', { code: 'EVENT_NOT_FOUND', status: 404 });
    ev.aplicar(body);
    await this.#manejarImagen(ev, body);
    await this.eventDAO.update(id, ev);
    return (await this.eventDAO.findById(id)).toPlain();
  }

  async finalizar(id) {
    const ev = await this.eventDAO.findById(id);
    if (!ev) throw new DomainError('Evento no encontrado', { code: 'EVENT_NOT_FOUND', status: 404 });
    ev.finalizar();
    await this.eventDAO.update(id, ev);
    return ev.toPlain();
  }

  async reabrir(id) {
    const ev = await this.eventDAO.findById(id);
    if (!ev) throw new DomainError('Evento no encontrado', { code: 'EVENT_NOT_FOUND', status: 404 });
    ev.reabrir();
    await this.eventDAO.update(id, ev);
    return ev.toPlain();
  }

  /** Activa un evento y desactiva el resto (un solo activo a la vez). */
  async activar(id) {
    const ev = await this.eventDAO.findById(id);
    if (!ev) throw new DomainError('Evento no encontrado', { code: 'EVENT_NOT_FOUND', status: 404 });
    await this.eventDAO.desactivarTodos();
    ev.activar();
    await this.eventDAO.update(id, ev);
    return { ok: true, activeEventId: ev.id };
  }

  /** Elimina un evento (si no es el único y no tiene leads). */
  async eliminar(id) {
    const ev = await this.eventDAO.findById(id);
    if (!ev) throw new DomainError('Evento no encontrado', { code: 'EVENT_NOT_FOUND', status: 404 });
    const total = await this.eventDAO.count();
    if (total <= 1) throw new DomainError('Debe existir al menos un evento', { code: 'EVENT_LAST' });
    if (await this.leadDAO.count({ eventId: id })) {
      throw new DomainError('El evento tiene leads registrados; no se puede eliminar', {
        code: 'EVENT_HAS_LEADS',
      });
    }
    await this.blobDAO.del(prizeKey(id));
    await this.eventDAO.delete(id); // draws en cascada (FK ON DELETE CASCADE)

    // Si borramos el activo, activamos el más reciente que quede.
    let activeEventId = null;
    if (ev.activo) {
      const [primero] = await this.eventDAO.listar();
      if (primero) {
        await this.activar(primero.id);
        activeEventId = primero.id;
      }
    } else {
      const a = await this.eventDAO.activo();
      activeEventId = a ? a.id : null;
    }
    return { ok: true, activeEventId };
  }

  /** Guarda/elimina la imagen del premio (dataURL) según el body. */
  async #manejarImagen(ev, body) {
    if (typeof body.premioImagen === 'string') {
      const img = decodeImage(body.premioImagen);
      if (img) {
        await this.blobDAO.put(prizeKey(ev.id), img.buffer, img.mime);
        await this.eventDAO.update(ev.id, { premioImagen: true });
        ev.premioImagen = true;
      }
    } else if (body.premioImagen === false || body.quitarImagen === true) {
      await this.blobDAO.del(prizeKey(ev.id));
      await this.eventDAO.update(ev.id, { premioImagen: false });
      ev.premioImagen = false;
    }
  }
}
