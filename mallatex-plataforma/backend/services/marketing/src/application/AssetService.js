import { DomainError } from '@mallatex/shared/ddd';
import { PLAIN_LIMIT, wantsPage, pageOpts, mapItems, paginateArray } from '@mallatex/shared/http';
import { Asset, DEFAULT_VIDEO_DB_MAX_BYTES } from '../domain/Asset.js';
import { decodeDataUrl } from '../infrastructure/images.js';
import { keyForAsset } from '../infrastructure/S3Storage.js';

/**
 * AssetService — casos de uso del banco de activos de marketing. Coordina la
 * decodificación del dataURL, la decisión de almacenamiento del agregado
 * (BYTEA vs S3 vs liga externa), la entrega del archivo y la migración
 * diferida de videos pendientes a S3.
 */
export class AssetService {
  constructor({ assetDAO, s3, env = process.env }) {
    this.assetDAO = assetDAO;
    this.s3 = s3;
    const mb = Number(env.MKT_VIDEO_DB_MAX_MB);
    this.maxVideoDbBytes = Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : DEFAULT_VIDEO_DB_MAX_BYTES;
  }

  /** Listado con filtros (?tipo, ?categoria, ?campaign, ?q) y paginación opcional. */
  async listar(query = {}) {
    const { tipo, categoria, campaign, q } = query;
    const where = { activo: true };
    if (tipo) where.tipo = tipo;
    if (categoria) where.categoria = categoria;
    if (campaign) where.campaignId = campaign;
    const order = [['created_at', 'DESC']];
    const needle = q ? String(q).toLowerCase() : '';
    const coincide = (a) =>
      [a.titulo, a.descripcion, a.categoria, a.productSku].join(' ').toLowerCase().includes(needle);

    // Modo paginado (?page): { items, total, page, pageSize, pages }.
    if (wantsPage(query)) {
      if (q) {
        // La búsqueda libre se evalúa en memoria y se pagina el resultado.
        const todos = await this.assetDAO.listado(where, { order });
        return mapItems(paginateArray(todos.filter(coincide), pageOpts(query)), (a) => a.toApi());
      }
      return mapItems(await this.assetDAO.paginado(where, { ...pageOpts(query), order }), (a) => a.toApi());
    }

    // Modo lista plana: arreglo con tope duro y sin blob.
    let items = await this.assetDAO.listado(where, { order, limit: PLAIN_LIMIT });
    if (q) items = items.filter(coincide);
    return items.map((a) => a.toApi());
  }

  /**
   * Alta de un activo. `body.file` es un dataURL base64 opcional; la matriz de
   * decisión de almacenamiento vive en el agregado. Cuando el destino es S3,
   * primero se crea la fila (para tener el id BIGSERIAL de la llave) y después
   * se sube el objeto.
   */
  async crear(body = {}, { uploadedBy = '' } = {}) {
    let file = null;
    if (body.file !== undefined && body.file !== null && body.file !== '') {
      file = decodeDataUrl(body.file);
      if (!file) {
        throw new DomainError('Archivo no válido; envía un dataURL base64', { code: 'ASSET_FILE_INVALIDO' });
      }
    }

    const asset = Asset.crear(
      { ...body, uploadedBy },
      { file, s3Disponible: this.s3.configured(), maxVideoDbBytes: this.maxVideoDbBytes }
    );

    const saved = await this.assetDAO.create(asset);
    if (asset.storage === 's3' && file) {
      // Con el id ya asignado se calcula la llave y se sube el objeto.
      const key = keyForAsset(saved.id, saved.titulo, file.mime);
      await this.s3.putObject(key, file.buffer, file.mime);
      await this.assetDAO.update(saved.id, { s3Key: key });
    }
    return (await this.assetDAO.porId(saved.id)).toApi();
  }

  /**
   * Resuelve la entrega del archivo del activo:
   *  - storage 'db'      -> { kind:'blob', mime, data }
   *  - storage 's3'      -> { kind:'redirect', url } (prefirmada, 15 min)
   *  - liga externa      -> { kind:'redirect', url }
   *  - sin archivo       -> 404
   */
  async archivo(id) {
    const row = await this.assetDAO.archivo(id);
    if (!row || !row.activo) {
      throw new DomainError('Activo no encontrado', { code: 'ASSET_NOT_FOUND', status: 404 });
    }
    if (row.storage === 'db' && row.blob) {
      return { kind: 'blob', mime: row.mime || 'application/octet-stream', data: row.blob };
    }
    if (row.storage === 's3' && row.s3Key) {
      return { kind: 'redirect', url: await this.s3.presignGet(row.s3Key, 900) };
    }
    if (row.externalUrl) {
      return { kind: 'redirect', url: row.externalUrl };
    }
    throw new DomainError('El activo no tiene archivo', { code: 'ASSET_SIN_ARCHIVO', status: 404 });
  }

  /** Actualiza metadatos (nunca el archivo). */
  async actualizar(id, body = {}) {
    const asset = await this.assetDAO.porId(id);
    if (!asset || !asset.activo) {
      throw new DomainError('Activo no encontrado', { code: 'ASSET_NOT_FOUND', status: 404 });
    }
    asset.aplicarMetadatos(body);
    await this.assetDAO.update(id, asset);
    return (await this.assetDAO.porId(id)).toApi();
  }

  /** Baja lógica. */
  async eliminar(id) {
    const asset = await this.assetDAO.porId(id);
    if (!asset) throw new DomainError('Activo no encontrado', { code: 'ASSET_NOT_FOUND', status: 404 });
    await this.assetDAO.update(id, { activo: false });
    return { ok: true };
  }

  /** Estado de la integración S3 y videos pendientes de migrar. */
  async s3Status() {
    const configured = this.s3.configured();
    return {
      configured,
      bucket: configured ? this.s3.bucket : null,
      pendingCount: await this.assetDAO.count({ pendingSync: true }),
    };
  }

  /**
   * Migra a S3 TODOS los activos con pending_sync (videos que quedaron en
   * BYTEA por falta de S3): sube el blob, fija storage 's3' + s3_key y limpia
   * el binario. Con S3 apagado responde 409 S3_OFF.
   */
  async syncS3() {
    if (!this.s3.configured()) {
      throw new DomainError('S3 no configurado', { code: 'S3_OFF', status: 409 });
    }
    const pendientes = await this.assetDAO.pendientesSync();
    let migrated = 0;
    const failed = [];
    for (const row of pendientes) {
      try {
        if (!row.blob) throw new Error('El activo pendiente no tiene blob');
        const key = keyForAsset(row.id, row.titulo, row.mime);
        await this.s3.putObject(key, row.blob, row.mime);
        await this.assetDAO.update(row.id, { storage: 's3', s3Key: key, blob: null, pendingSync: false });
        migrated += 1;
      } catch (e) {
        failed.push({ id: row.id, error: e.message });
      }
    }
    return { configured: true, migrated, failed };
  }
}
