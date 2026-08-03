import { DomainError } from '@mallatex/shared/ddd';

/**
 * S3Storage — adaptador de almacenamiento de objetos (AWS S3 o compatibles
 * como Cloudflare R2 vía S3_ENDPOINT). El SDK de AWS se importa de forma
 * dinámica dentro de los métodos, de modo que el servicio arranca sin la
 * dependencia instalada cuando S3_MODE=off.
 *
 * Variables de entorno:
 *   S3_MODE ('off'|'s3'), S3_BUCKET, S3_REGION (default 'auto'),
 *   S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT (opcional; con
 *   endpoint se fuerza path-style para compatibles).
 */
export class S3Storage {
  #client = null;

  constructor(env = process.env) {
    this.mode = String(env.S3_MODE || 'off').toLowerCase();
    this.bucket = env.S3_BUCKET || '';
    this.region = env.S3_REGION || 'auto';
    this.accessKeyId = env.S3_ACCESS_KEY_ID || '';
    this.secretAccessKey = env.S3_SECRET_ACCESS_KEY || '';
    this.endpoint = env.S3_ENDPOINT || '';
  }

  /** ¿Hay configuración completa para operar contra S3? */
  configured() {
    return this.mode === 's3' && Boolean(this.bucket && this.accessKeyId && this.secretAccessKey);
  }

  #assertConfigured() {
    if (!this.configured()) {
      throw new DomainError('S3 no configurado', { code: 'S3_OFF', status: 409 });
    }
  }

  /** Cliente perezoso: sólo importa el SDK cuando de verdad se usa S3. */
  async #getClient() {
    this.#assertConfigured();
    if (!this.#client) {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.#client = new S3Client({
        region: this.region,
        credentials: { accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey },
        ...(this.endpoint ? { endpoint: this.endpoint, forcePathStyle: true } : {}),
      });
    }
    return this.#client;
  }

  /** Sube un objeto; devuelve la llave. */
  async putObject(key, buffer, mime) {
    const client = await this.#getClient();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime || 'application/octet-stream',
      })
    );
    return key;
  }

  /** URL de lectura prefirmada (15 minutos por defecto). */
  async presignGet(key, expiresSec = 900) {
    const client = await this.#getClient();
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresSec,
    });
  }
}

// ---- Llaves de objeto ------------------------------------------------

const EXT_POR_MIME = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
});

/** Slug seguro para nombres de archivo (sin acentos ni símbolos). */
export function slug(texto) {
  return (
    String(texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'activo'
  );
}

/** Llave S3 del activo: marketing/assets/<id>-<slug(titulo)>.<ext>. */
export function keyForAsset(id, titulo, mime) {
  const ext =
    EXT_POR_MIME[mime] ||
    (String(mime || '').split('/')[1] || '').replace(/[^a-z0-9]/gi, '').slice(0, 8) ||
    'bin';
  return `marketing/assets/${id}-${slug(titulo)}.${ext}`;
}
