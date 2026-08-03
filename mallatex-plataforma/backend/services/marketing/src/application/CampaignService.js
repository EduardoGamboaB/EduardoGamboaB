import { Op } from 'sequelize';
import { DomainError } from '@mallatex/shared/ddd';
import { Campaign } from '../domain/Campaign.js';

/**
 * CampaignService — calendario de campañas de marketing. La vigencia es un
 * cálculo (hoy dentro del rango y no cerrada), nunca un dato capturado.
 */
export class CampaignService {
  constructor({ campaignDAO }) {
    this.campaignDAO = campaignDAO;
  }

  /** Listado (?year= filtra campañas que tocan ese año) con `vigente` calculado. */
  async listar(query = {}) {
    const where = {};
    const year = Number(query.year);
    if (Number.isInteger(year) && year > 1900) {
      // Traslape con el año: inicia antes de que termine y termina después de que empiece.
      where.fechaInicio = { [Op.lte]: `${year}-12-31` };
      where.fechaFin = { [Op.gte]: `${year}-01-01` };
    }
    const items = await this.campaignDAO.findAll(where, {
      order: [['fecha_inicio', 'ASC'], ['id', 'ASC']],
    });
    const hoy = Campaign.hoyISO();
    return items.map((c) => c.toApi(hoy));
  }

  async crear(body = {}, { createdBy = '' } = {}) {
    const camp = Campaign.crear(body, { createdBy });
    const saved = await this.campaignDAO.create(camp);
    return saved.toApi();
  }

  async actualizar(id, body = {}) {
    const camp = await this.#obtener(id);
    camp.aplicar(body);
    await this.campaignDAO.update(id, camp);
    return (await this.#obtener(id)).toApi();
  }

  async cerrar(id) {
    const camp = await this.#obtener(id);
    camp.cerrar();
    await this.campaignDAO.update(id, camp);
    return (await this.#obtener(id)).toApi();
  }

  // ---- Auxiliares ----------------------------------------------------
  async #obtener(id) {
    const camp = await this.campaignDAO.findById(id);
    if (!camp) throw new DomainError('Campaña no encontrada', { code: 'CAMPANA_NOT_FOUND', status: 404 });
    return camp;
  }
}
