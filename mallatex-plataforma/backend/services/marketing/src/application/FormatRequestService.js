import { DomainError } from '@mallatex/shared/ddd';
import { PLAIN_LIMIT } from '@mallatex/shared/http';
import { FormatRequest } from '../domain/FormatRequest.js';
import { Folio } from '../domain/Folio.js';

/**
 * FormatRequestService — casos de uso de solicitudes de formato. El vendedor
 * levanta y sigue sus solicitudes desde la app; marketing las atiende desde la
 * web (transiciones de estado y entregable ligado al banco de activos).
 */
export class FormatRequestService {
  constructor({ formatRequestDAO, assetDAO }) {
    this.formatRequestDAO = formatRequestDAO;
    this.assetDAO = assetDAO;
  }

  /** Alta por el empleado; el folio FMT-#### sale del id BIGSERIAL. */
  async crear(body = {}, { solicitanteId, solicitante } = {}) {
    const fr = FormatRequest.crear(body, { solicitanteId, solicitante });
    if (fr.referenciaAssetId) await this.#validarAsset(fr.referenciaAssetId, 'referencia');
    const created = await this.formatRequestDAO.create(fr);
    const updated = await this.formatRequestDAO.update(created.id, {
      folio: Folio.formatRequest(created.id).value,
    });
    return updated.toPlain();
  }

  /** Solicitudes del empleado autenticado (más recientes primero). */
  async mias(solicitanteId) {
    const items = await this.formatRequestDAO.deSolicitante(solicitanteId, { limit: PLAIN_LIMIT });
    return items.map((f) => f.toPlain());
  }

  /** Listado para marketing (?estado=). */
  async listar(query = {}) {
    const where = {};
    if (query.estado) where.estado = query.estado;
    const items = await this.formatRequestDAO.findAll(where, {
      order: [['created_at', 'DESC']],
      limit: PLAIN_LIMIT,
    });
    return items.map((f) => f.toPlain());
  }

  /** Transición de estado por marketing (entregado exige entregable). */
  async cambiarEstado(id, { estado, entregableAssetId } = {}) {
    const fr = await this.#obtener(id);
    if (entregableAssetId) await this.#validarAsset(entregableAssetId, 'entregable');
    fr.cambiarEstado(estado, { entregableAssetId });
    await this.formatRequestDAO.update(id, fr);
    return (await this.#obtener(id)).toPlain();
  }

  /**
   * Mensaje al hilo. El vendedor sólo puede escribir en sus propias
   * solicitudes; marketing en cualquiera. `role` viene resuelto de la ruta.
   */
  async mensaje(id, { by, role, message, employeeId = null } = {}) {
    const fr = await this.#obtener(id);
    if (role === 'vendedor' && !fr.esDe(employeeId)) {
      throw new DomainError('Sólo puedes comentar tus propias solicitudes', {
        code: 'FMT_NO_ES_TUYA',
        status: 403,
      });
    }
    fr.addMessage({ by, role, message });
    await this.formatRequestDAO.update(id, { mensajes: fr.mensajes });
    return (await this.#obtener(id)).toPlain();
  }

  // ---- Auxiliares ----------------------------------------------------
  async #obtener(id) {
    const fr = await this.formatRequestDAO.findById(id);
    if (!fr) throw new DomainError('Solicitud no encontrada', { code: 'FMT_NOT_FOUND', status: 404 });
    return fr;
  }

  async #validarAsset(assetId, papel) {
    const asset = await this.assetDAO.porId(assetId);
    if (!asset || !asset.activo) {
      throw new DomainError(`El activo de ${papel} no existe`, { code: 'ASSET_NOT_FOUND', status: 404 });
    }
  }
}
