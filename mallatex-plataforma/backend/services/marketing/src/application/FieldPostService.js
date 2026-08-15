import { DomainError } from '@mallatex/shared/ddd';
import { PLAIN_LIMIT } from '@mallatex/shared/http';
import { FieldPost } from '../domain/FieldPost.js';
import { Folio } from '../domain/Folio.js';
import { Asset } from '../domain/Asset.js';
import { decodeAssetFile } from '../infrastructure/images.js';
import { keyForAsset } from '../infrastructure/S3Storage.js';

// Tope por foto (imagen): igual criterio que decodeImage en images.js.
const MAX_FOTO_BYTES = 6 * 1024 * 1024; // 6 MB
const MAX_FOTOS = 8; // por aporte

/**
 * FieldPostService — casos de uso de los aportes de campo. El vendedor sube un
 * aporte (fotos + contexto) desde la app; marketing lo revisa, comenta,
 * aprueba/rechaza y —si procede— lo publica al banco de activos creando un
 * Asset imagen por cada foto (cierra el ciclo: campo -> banco -> fuerza de venta).
 */
export class FieldPostService {
  constructor({ fieldPostDAO, fieldPostPhotoDAO, assetDAO, s3 }) {
    this.fieldPostDAO = fieldPostDAO;
    this.photoDAO = fieldPostPhotoDAO;
    this.assetDAO = assetDAO;
    this.s3 = s3;
  }

  /**
   * Alta por el vendedor con 1..N fotos (`body.fotos` = arreglo de dataURL). Se
   * valida cada foto contra los bytes reales (lista blanca de imagen) y se
   * persiste como BYTEA. El folio APC-#### se asigna con el id BIGSERIAL.
   */
  async crear(body = {}, { autorId, autor } = {}) {
    const fotos = Array.isArray(body.fotos) ? body.fotos.filter(Boolean) : [];
    if (fotos.length === 0) {
      throw new DomainError('Adjunta al menos una foto del proyecto', { code: 'APC_FOTO_REQUERIDA' });
    }
    if (fotos.length > MAX_FOTOS) {
      throw new DomainError(`Máximo ${MAX_FOTOS} fotos por aporte`, { code: 'APC_DEMASIADAS_FOTOS' });
    }
    // Se decodifican y validan TODAS antes de escribir nada.
    const decodificadas = fotos.map((f) => decodeAssetFile(f, 'imagen', { maxBytes: MAX_FOTO_BYTES }));
    if (decodificadas.some((d) => !d)) {
      throw new DomainError(
        'Alguna foto no es válida: envía imágenes png/jpeg/webp/gif de máximo 6 MB.',
        { code: 'APC_FOTO_INVALIDA' }
      );
    }

    const fp = FieldPost.crear(body, { autorId, autor });
    const created = await this.fieldPostDAO.create(fp);
    const conFolio = await this.fieldPostDAO.update(created.id, {
      folio: Folio.fieldPost(created.id).value,
    });

    for (let i = 0; i < decodificadas.length; i += 1) {
      const foto = decodificadas[i];
      await this.photoDAO.create({
        fieldPostId: created.id,
        mime: foto.mime,
        sizeBytes: foto.sizeBytes,
        storage: 'db',
        blob: foto.buffer,
        orden: i,
      });
    }
    return this.#conFotos(conFolio.toPlain ? conFolio.toPlain() : conFolio);
  }

  /** Aportes del empleado autenticado (con metadata de fotos). */
  async mias(autorId) {
    const items = await this.fieldPostDAO.deAutor(autorId, { limit: PLAIN_LIMIT });
    return Promise.all(items.map((f) => this.#conFotos(f.toPlain())));
  }

  /** Listado para marketing (?estado=), con metadata de fotos. */
  async listar(query = {}) {
    const where = {};
    if (query.estado) where.estado = query.estado;
    const items = await this.fieldPostDAO.findAll(where, {
      order: [['created_at', 'DESC']],
      limit: PLAIN_LIMIT,
    });
    return Promise.all(items.map((f) => this.#conFotos(f.toPlain())));
  }

  /** Detalle de un aporte con la metadata de sus fotos. */
  async detalle(id) {
    const fp = await this.#obtener(id);
    return this.#conFotos(fp.toPlain());
  }

  /**
   * Entrega el archivo de una foto:
   *  - storage 'db' -> { kind:'blob', mime, data }
   *  - storage 's3' -> { kind:'redirect', url } (prefirmada)
   */
  async foto(photoId) {
    const row = await this.photoDAO.archivo(photoId);
    if (!row) throw new DomainError('Foto no encontrada', { code: 'APC_FOTO_NOT_FOUND', status: 404 });
    if (row.storage === 's3' && row.s3Key) {
      return { kind: 'redirect', url: await this.s3.presignGet(row.s3Key, 900) };
    }
    if (row.storage === 'db' && row.blob) {
      return { kind: 'blob', mime: row.mime || 'application/octet-stream', data: row.blob };
    }
    throw new DomainError('La foto no tiene archivo', { code: 'APC_FOTO_SIN_ARCHIVO', status: 404 });
  }

  /** Transición de estado por marketing (aprobado|rechazado). */
  async cambiarEstado(id, { estado, notaMarketing } = {}) {
    const fp = await this.#obtener(id);
    fp.cambiarEstado(estado, { notaMarketing });
    await this.fieldPostDAO.update(id, fp);
    return this.detalle(id);
  }

  /** Mensaje al hilo (marketing en cualquiera; vendedor sólo en los suyos). */
  async mensaje(id, { by, role, message, employeeId = null } = {}) {
    const fp = await this.#obtener(id);
    if (role === 'vendedor' && !fp.esDe(employeeId)) {
      throw new DomainError('Sólo puedes comentar tus propios aportes', {
        code: 'APC_NO_ES_TUYO',
        status: 403,
      });
    }
    fp.addMessage({ by, role, message });
    await this.fieldPostDAO.update(id, { mensajes: fp.mensajes });
    return this.detalle(id);
  }

  /**
   * Publica el aporte al banco: por cada foto crea un Asset imagen (reusando el
   * blob) con la categoría "casos-exito" y el contexto como descripción, y pasa
   * el aporte a estado 'publicado'. Requiere que esté 'aprobado'.
   */
  async publicarAlBanco(id, { uploadedBy = 'Marketing', categoria = 'casos-exito' } = {}) {
    const fp = await this.#obtener(id);
    const fotos = await this.photoDAO.listByPost(id);
    if (fotos.length === 0) {
      throw new DomainError('El aporte no tiene fotos que publicar', { code: 'APC_SIN_FOTOS', status: 409 });
    }
    const s3Disponible = this.s3.configured();
    const assetIds = [];
    for (let i = 0; i < fotos.length; i += 1) {
      const rawFoto = await this.photoDAO.archivo(fotos[i].id);
      if (!rawFoto || !rawFoto.blob) continue;
      const titulo = fotos.length > 1 ? `${fp.titulo} (${i + 1})` : fp.titulo;
      const asset = new Asset({
        tipo: 'imagen',
        titulo,
        descripcion: this.#descripcion(fp),
        categoria,
        uploadedBy,
        mime: rawFoto.mime,
        sizeBytes: Number(rawFoto.sizeBytes || rawFoto.blob.length),
        storage: 'db',
      });
      asset.fileBuffer = rawFoto.blob;
      const saved = await this.assetDAO.create(asset);
      if (s3Disponible) {
        // Con S3 disponible movemos el binario a la nube (paridad con AssetService).
        try {
          const key = keyForAsset(saved.id, saved.titulo, rawFoto.mime);
          await this.s3.putObject(key, rawFoto.blob, rawFoto.mime);
          await this.assetDAO.update(saved.id, { storage: 's3', s3Key: key, blob: null });
        } catch {
          // Si falla la subida, el asset queda servible desde BD; no se aborta.
        }
      }
      assetIds.push(saved.id);
    }
    fp.cambiarEstado('publicado', { assetIds });
    await this.fieldPostDAO.update(id, fp);
    return this.detalle(id);
  }

  // ---- Auxiliares ----------------------------------------------------
  #descripcion(fp) {
    // Contexto enriquecido para el banco: "contexto · Ubicación · Cultivo · Cliente".
    const partes = [fp.contexto];
    if (fp.ubicacion) partes.push(`📍 ${fp.ubicacion}`);
    if (fp.cultivo) partes.push(`🌱 ${fp.cultivo}`);
    if (fp.producto) partes.push(fp.producto);
    if (fp.cliente) partes.push(fp.cliente);
    return partes.filter(Boolean).join(' · ').slice(0, 2000);
  }

  async #obtener(id) {
    const fp = await this.fieldPostDAO.findById(id);
    if (!fp) throw new DomainError('Aporte no encontrado', { code: 'APC_NOT_FOUND', status: 404 });
    return fp;
  }

  async #conFotos(plain) {
    const fotos = await this.photoDAO.listByPost(plain.id);
    return {
      ...plain,
      fotos: fotos.map((f) => ({ id: f.id, mime: f.mime, sizeBytes: f.sizeBytes, orden: f.orden })),
      fotoCount: fotos.length,
    };
  }
}
