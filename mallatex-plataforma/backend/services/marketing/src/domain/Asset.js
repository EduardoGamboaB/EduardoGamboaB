import { AggregateRoot, DomainEvent, DomainError } from '@mallatex/shared/ddd';

// ---- Catálogos y normalizadores de dominio -------------------------
export const TIPOS_ASSET = ['imagen', 'video', 'documento'];

/** Tope de imagen/documento almacenado como BYTEA (storage 'db'). */
export const MAX_DB_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

/** Tope por defecto para video en BYTEA cuando no hay S3 (MKT_VIDEO_DB_MAX_MB). */
export const DEFAULT_VIDEO_DB_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export function clean(v, max = 500) {
  return (v == null ? '' : String(v)).trim().slice(0, max);
}

/**
 * Normaliza una liga externa: solo http(s) con host. Evita open redirect y
 * esquemas peligrosos (javascript:, data:, file:) al servirse vía 302 en
 * /assets/:id/file (ver pentest #10). Devuelve '' si no es válida.
 */
export function cleanUrl(v, max = 1000) {
  const s = clean(v, max);
  if (!s) return '';
  let u;
  try { u = new URL(s); } catch { throw new DomainError('Liga externa inválida', { code: 'ASSET_URL_INVALIDA' }); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new DomainError('La liga externa debe ser http(s)', { code: 'ASSET_URL_ESQUEMA' });
  }
  if (!u.hostname) throw new DomainError('Liga externa sin host', { code: 'ASSET_URL_HOST' });
  return u.toString();
}

/** Id numérico opcional (FK): número válido o null. */
export function idOpcional(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Asset — raíz de agregado del banco de activos de marketing. Encapsula la
 * decisión de almacenamiento según el tipo y la disponibilidad de S3:
 *   - imagen/documento con archivo  -> BYTEA en BD (storage 'db').
 *   - video con archivo y S3        -> S3 (storage 's3'; la subida la hace la app).
 *   - video con archivo sin S3      -> BYTEA si cabe (pendingSync=true) o error 413.
 *   - sólo liga externa             -> storage 'external' (YouTube, Drive, etc.).
 */
export class Asset extends AggregateRoot {
  constructor(props = {}) {
    super(props.id);
    this.tipo = props.tipo;
    this.titulo = props.titulo;
    this.descripcion = props.descripcion || '';
    this.categoria = props.categoria || '';
    this.productSku = props.productSku || '';
    this.campaignId = props.campaignId ?? null;
    this.mime = props.mime || '';
    this.sizeBytes = Number(props.sizeBytes || 0);
    this.storage = props.storage || 'db';
    this.s3Key = props.s3Key || null;
    this.externalUrl = props.externalUrl || '';
    this.pendingSync = props.pendingSync ?? false;
    this.uploadedBy = props.uploadedBy || '';
    this.activo = props.activo ?? true;
    this.createdAt = props.createdAt || null;
    // Buffer transitorio del archivo recién decodificado (no se serializa;
    // el DAO lo persiste como BYTEA sólo cuando storage='db').
    this.fileBuffer = null;
  }

  /**
   * Alta de un activo. `file` es `{ buffer, mime, sizeBytes }` ya decodificado
   * del dataURL (o null). Aplica la matriz de decisión de almacenamiento.
   */
  static crear(body = {}, { file = null, s3Disponible = false, maxVideoDbBytes = DEFAULT_VIDEO_DB_MAX_BYTES } = {}) {
    const tipo = clean(body.tipo, 20);
    if (!TIPOS_ASSET.includes(tipo)) {
      throw new DomainError('Tipo de activo no válido (imagen|video|documento)', { code: 'ASSET_TIPO_INVALIDO' });
    }
    const titulo = clean(body.titulo, 200);
    if (!titulo) throw new DomainError('El título es obligatorio', { code: 'ASSET_TITULO_REQUERIDO' });

    const externalUrl = cleanUrl(body.externalUrl, 1000);
    if (!file && !externalUrl) {
      throw new DomainError('Adjunta un archivo o proporciona una liga externa', {
        code: 'ASSET_FUENTE_REQUERIDA',
      });
    }

    // ---- Matriz de decisión de almacenamiento ----------------------
    let storage = 'external';
    let pendingSync = false;
    if (file) {
      if (tipo === 'video') {
        if (s3Disponible) {
          storage = 's3'; // la capa de aplicación sube el buffer y fija s3Key
        } else if (file.sizeBytes <= maxVideoDbBytes) {
          storage = 'db';
          pendingSync = true; // queda en BD esperando migrar a S3
        } else {
          throw new DomainError('Video demasiado grande; configura S3 o usa liga externa', {
            code: 'VIDEO_TOO_LARGE',
            status: 413,
          });
        }
      } else {
        if (file.sizeBytes > MAX_DB_FILE_BYTES) {
          throw new DomainError('Archivo demasiado grande (máximo 20 MB)', {
            code: 'FILE_TOO_LARGE',
            status: 413,
          });
        }
        storage = 'db';
      }
    }

    const asset = new Asset({
      tipo,
      titulo,
      descripcion: clean(body.descripcion, 2000),
      categoria: clean(body.categoria, 120),
      productSku: clean(body.productSku, 120),
      campaignId: idOpcional(body.campaignId),
      mime: file ? file.mime : '',
      sizeBytes: file ? file.sizeBytes : 0,
      storage,
      pendingSync,
      externalUrl,
      uploadedBy: clean(body.uploadedBy, 120),
    });
    asset.fileBuffer = file ? file.buffer : null;
    asset.addDomainEvent(new DomainEvent('AssetCreado', { tipo, titulo, storage }));
    return asset;
  }

  /** ¿Tiene un archivo descargable (BYTEA o llave S3)? */
  get hasFile() {
    return (this.storage === 'db' && this.sizeBytes > 0) || (this.storage === 's3' && Boolean(this.s3Key));
  }

  /** Actualiza sólo metadatos (nunca el archivo ni el almacenamiento). */
  aplicarMetadatos(body = {}) {
    if (body.titulo !== undefined) {
      const titulo = clean(body.titulo, 200);
      if (!titulo) throw new DomainError('El título es obligatorio', { code: 'ASSET_TITULO_REQUERIDO' });
      this.titulo = titulo;
    }
    if (body.descripcion !== undefined) this.descripcion = clean(body.descripcion, 2000);
    if (body.categoria !== undefined) this.categoria = clean(body.categoria, 120);
    if (body.productSku !== undefined) this.productSku = clean(body.productSku, 120);
    if (body.campaignId !== undefined) this.campaignId = idOpcional(body.campaignId);
    if (body.externalUrl !== undefined) this.externalUrl = cleanUrl(body.externalUrl, 1000);
    return this;
  }

  desactivar() {
    this.activo = false;
  }

  toPlain() {
    return {
      id: this.id,
      tipo: this.tipo,
      titulo: this.titulo,
      descripcion: this.descripcion,
      categoria: this.categoria,
      productSku: this.productSku,
      campaignId: this.campaignId,
      mime: this.mime,
      sizeBytes: this.sizeBytes,
      storage: this.storage,
      s3Key: this.s3Key,
      externalUrl: this.externalUrl,
      pendingSync: this.pendingSync,
      uploadedBy: this.uploadedBy,
      activo: this.activo,
      createdAt: this.createdAt,
    };
  }

  /** Shape público del contrato (sin blob ni llaves internas). */
  toApi() {
    return {
      id: this.id,
      tipo: this.tipo,
      titulo: this.titulo,
      descripcion: this.descripcion,
      categoria: this.categoria,
      productSku: this.productSku,
      campaignId: this.campaignId,
      mime: this.mime,
      sizeBytes: this.sizeBytes,
      storage: this.storage,
      externalUrl: this.externalUrl,
      pendingSync: this.pendingSync,
      uploadedBy: this.uploadedBy,
      createdAt: this.createdAt,
      hasFile: this.hasFile,
    };
  }
}
