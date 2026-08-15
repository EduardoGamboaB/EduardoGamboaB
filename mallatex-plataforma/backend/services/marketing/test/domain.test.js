import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Asset, MAX_DB_FILE_BYTES } from '../src/domain/Asset.js';
import { Folio } from '../src/domain/Folio.js';
import { FormatRequest } from '../src/domain/FormatRequest.js';
import { FieldPost } from '../src/domain/FieldPost.js';
import { Campaign } from '../src/domain/Campaign.js';
import { PrintItem, validarMovimiento } from '../src/domain/PrintItem.js';
// S3Storage importa el SDK de AWS de forma dinámica dentro de sus métodos, por
// lo que este import NO requiere @aws-sdk instalado.
import { S3Storage, slug, keyForAsset } from '../src/infrastructure/S3Storage.js';
import { decodeDataUrl } from '../src/infrastructure/images.js';
import { DomainError } from '@mallatex/shared/ddd';

const MB = 1024 * 1024;
const file = (sizeBytes, mime = 'application/octet-stream') => ({
  buffer: Buffer.alloc(Math.min(sizeBytes, 16)), // el tamaño manda, no el buffer
  mime,
  sizeBytes,
});

// ---------- Asset: matriz de decisión de almacenamiento ----------

test('imagen con archivo -> storage db, sin pendingSync', () => {
  const a = Asset.crear(
    { tipo: 'imagen', titulo: 'Lona sombra' },
    { file: file(2 * MB, 'image/png'), s3Disponible: false }
  );
  assert.equal(a.storage, 'db');
  assert.equal(a.pendingSync, false);
  assert.equal(a.mime, 'image/png');
  assert.equal(a.hasFile, true);
});

test('documento con archivo -> storage db', () => {
  const a = Asset.crear(
    { tipo: 'documento', titulo: 'Ficha técnica' },
    { file: file(1 * MB, 'application/pdf'), s3Disponible: true }
  );
  assert.equal(a.storage, 'db', 'documento va a BD aunque haya S3');
  assert.equal(a.pendingSync, false);
});

test('imagen/documento por encima del tope de BD -> 413', () => {
  assert.throws(
    () => Asset.crear({ tipo: 'imagen', titulo: 'Enorme' }, { file: file(MAX_DB_FILE_BYTES + 1) }),
    (e) => e instanceof DomainError && e.code === 'FILE_TOO_LARGE' && e.status === 413
  );
});

test('video con archivo y S3 configurado -> storage s3', () => {
  const a = Asset.crear(
    { tipo: 'video', titulo: 'Spot' },
    { file: file(80 * MB, 'video/mp4'), s3Disponible: true }
  );
  assert.equal(a.storage, 's3');
  assert.equal(a.pendingSync, false);
});

test('video sin S3 y <= tope -> db con pendingSync', () => {
  const a = Asset.crear(
    { tipo: 'video', titulo: 'Spot corto' },
    { file: file(25 * MB, 'video/mp4'), s3Disponible: false, maxVideoDbBytes: 25 * MB }
  );
  assert.equal(a.storage, 'db');
  assert.equal(a.pendingSync, true, 'queda pendiente de migrar a S3');
});

test('video sin S3 y > tope -> 413 con el mensaje del contrato', () => {
  assert.throws(
    () =>
      Asset.crear(
        { tipo: 'video', titulo: 'Spot largo' },
        { file: file(26 * MB, 'video/mp4'), s3Disponible: false, maxVideoDbBytes: 25 * MB }
      ),
    (e) =>
      e instanceof DomainError &&
      e.code === 'VIDEO_TOO_LARGE' &&
      e.status === 413 &&
      e.message === 'Video demasiado grande; configura S3 o usa liga externa'
  );
});

test('externalUrl sola es válida para cualquier tipo -> storage external', () => {
  for (const tipo of ['imagen', 'video', 'documento']) {
    const a = Asset.crear({ tipo, titulo: 'Liga', externalUrl: 'https://youtu.be/x' });
    assert.equal(a.storage, 'external');
    assert.equal(a.hasFile, false);
    assert.equal(a.externalUrl, 'https://youtu.be/x');
  }
});

test('sin archivo y sin liga externa -> error de dominio', () => {
  assert.throws(
    () => Asset.crear({ tipo: 'imagen', titulo: 'Vacío' }),
    (e) => e.code === 'ASSET_FUENTE_REQUERIDA'
  );
});

test('titulo obligatorio y tipo del catálogo', () => {
  assert.throws(
    () => Asset.crear({ tipo: 'imagen', titulo: '  ', externalUrl: 'https://x' }),
    (e) => e.code === 'ASSET_TITULO_REQUERIDO'
  );
  assert.throws(
    () => Asset.crear({ tipo: 'gif', titulo: 'X', externalUrl: 'https://x' }),
    (e) => e.code === 'ASSET_TIPO_INVALIDO'
  );
});

test('aplicarMetadatos no toca archivo ni almacenamiento', () => {
  const a = Asset.crear(
    { tipo: 'imagen', titulo: 'Original' },
    { file: file(1 * MB, 'image/jpeg') }
  );
  a.aplicarMetadatos({ titulo: 'Editado', categoria: 'sombra', storage: 's3', mime: 'video/mp4' });
  assert.equal(a.titulo, 'Editado');
  assert.equal(a.categoria, 'sombra');
  assert.equal(a.storage, 'db');
  assert.equal(a.mime, 'image/jpeg');
});

// ---------- Folio FMT ----------

test('folio FMT con relleno a cuatro dígitos', () => {
  assert.equal(Folio.formatRequest(7).value, 'FMT-0007');
  assert.equal(Folio.formatRequest(42).value, 'FMT-0042');
  assert.equal(Folio.formatRequest(12345).value, 'FMT-12345');
});

// ---------- FormatRequest: transiciones de estado ----------

const nuevaSolicitud = () =>
  FormatRequest.crear({ titulo: 'Lona 3x2' }, { solicitanteId: 9, solicitante: 'Ana' });

test('crear inicia en solicitado y asignarFolio usa el id secuencial', () => {
  const fr = nuevaSolicitud();
  assert.equal(fr.estado, 'solicitado');
  assert.deepEqual(fr.mensajes, []);
  assert.equal(fr.asignarFolio(15), 'FMT-0015');
});

test('titulo y solicitante son obligatorios', () => {
  assert.throws(
    () => FormatRequest.crear({ titulo: ' ' }, { solicitante: 'Ana' }),
    (e) => e.code === 'FMT_TITULO_REQUERIDO'
  );
  assert.throws(
    () => FormatRequest.crear({ titulo: 'Lona' }, { solicitante: '' }),
    (e) => e.code === 'FMT_SOLICITANTE_REQUERIDO'
  );
});

test('solicitado -> en_diseno -> entregado (con entregable) es el camino feliz', () => {
  const fr = nuevaSolicitud();
  fr.cambiarEstado('en_diseno');
  assert.equal(fr.estado, 'en_diseno');
  fr.cambiarEstado('entregado', { entregableAssetId: 77 });
  assert.equal(fr.estado, 'entregado');
  assert.equal(fr.entregableAssetId, 77);
});

test('entregado requiere entregableAssetId', () => {
  const fr = nuevaSolicitud();
  fr.cambiarEstado('en_diseno');
  assert.throws(
    () => fr.cambiarEstado('entregado'),
    (e) => e instanceof DomainError && e.code === 'FMT_ENTREGABLE_REQUERIDO'
  );
  assert.equal(fr.estado, 'en_diseno', 'el estado no cambió');
});

test('transiciones inválidas: saltos y estados finales', () => {
  const fr = nuevaSolicitud();
  assert.throws(
    () => fr.cambiarEstado('entregado', { entregableAssetId: 1 }),
    (e) => e.code === 'FMT_TRANSICION_INVALIDA' && e.status === 409,
    'solicitado no puede saltar directo a entregado'
  );
  fr.cambiarEstado('rechazado');
  assert.throws(() => fr.cambiarEstado('en_diseno'), (e) => e.code === 'FMT_TRANSICION_INVALIDA');
  assert.throws(() => fr.cambiarEstado('planchado'), (e) => e.code === 'FMT_ESTADO_INVALIDO');
});

test('addMessage agrega {by, role, message, at} y valida el texto', () => {
  const fr = nuevaSolicitud();
  fr.addMessage({ by: 'Ana', role: 'vendedor', message: '¿Cómo va?' });
  fr.addMessage({ by: 'MKT', role: 'marketing', message: 'En diseño' });
  assert.equal(fr.mensajes.length, 2);
  assert.equal(fr.mensajes[0].role, 'vendedor');
  assert.equal(fr.mensajes[1].role, 'marketing');
  assert.ok(fr.mensajes[0].at, 'lleva marca de tiempo ISO');
  assert.throws(() => fr.addMessage({ by: 'Ana', message: '  ' }), (e) => e.code === 'FMT_MENSAJE_REQUERIDO');
});

test('esDe compara al solicitante sin importar el tipo (string/número)', () => {
  const fr = nuevaSolicitud();
  assert.equal(fr.esDe('9'), true);
  assert.equal(fr.esDe(10), false);
});

// ---------- Campaign: vigencia en los bordes ----------

const campVerano = () =>
  Campaign.crear({ nombre: 'Verano', fechaInicio: '2026-08-01', fechaFin: '2026-08-31' });

test('vigente incluye ambos extremos del rango', () => {
  const c = campVerano();
  assert.equal(c.vigente('2026-07-31'), false);
  assert.equal(c.vigente('2026-08-01'), true, 'el día de inicio cuenta');
  assert.equal(c.vigente('2026-08-15'), true);
  assert.equal(c.vigente('2026-08-31'), true, 'el día de fin cuenta');
  assert.equal(c.vigente('2026-09-01'), false);
});

test('cerrar apaga la vigencia aunque hoy esté en rango', () => {
  const c = campVerano();
  c.cerrar();
  assert.equal(c.estado, 'cerrada');
  assert.equal(c.vigente('2026-08-15'), false);
});

test('crear valida nombre, fechas y orden inicio <= fin', () => {
  assert.throws(
    () => Campaign.crear({ nombre: '', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' }),
    (e) => e.code === 'CAMPANA_NOMBRE_REQUERIDO'
  );
  assert.throws(
    () => Campaign.crear({ nombre: 'X', fechaInicio: 'enero', fechaFin: '2026-02-01' }),
    (e) => e.code === 'CAMPANA_FECHA_INVALIDA'
  );
  assert.throws(
    () => Campaign.crear({ nombre: 'X', fechaInicio: '2026-03-01', fechaFin: '2026-02-01' }),
    (e) => e.code === 'CAMPANA_RANGO_INVALIDO'
  );
  // Rango de un solo día es válido y vigente ese día.
  const unDia = Campaign.crear({ nombre: 'Flash', fechaInicio: '2026-05-05', fechaFin: '2026-05-05' });
  assert.equal(unDia.vigente('2026-05-05'), true);
});

test('aplicar revalida el rango al mover fechas', () => {
  const c = campVerano();
  assert.throws(() => c.aplicar({ fechaFin: '2026-07-01' }), (e) => e.code === 'CAMPANA_RANGO_INVALIDO');
  c.aplicar({ fechaFin: '2026-09-15' });
  assert.equal(c.fechaFin, '2026-09-15');
});

test('toApi incluye la vigencia calculada', () => {
  const api = campVerano().toApi('2026-08-10');
  assert.equal(api.vigente, true);
  assert.equal(api.estado, 'planeada');
});

// ---------- PrintItem: existencia y reglas de stock ----------

test('existencia = entradas - salidas +/- ajustes', () => {
  const movs = [
    { tipo: 'entrada', cantidad: 10 },
    { tipo: 'salida', cantidad: 3 },
    { tipo: 'ajuste', cantidad: -2 },
    { tipo: 'ajuste', cantidad: 1 },
  ];
  assert.equal(PrintItem.existencia(movs), 6);
  assert.equal(PrintItem.existencia([]), 0);
});

test('salida que deja negativo -> STOCK_INSUFICIENTE (409)', () => {
  assert.throws(
    () => validarMovimiento({ tipo: 'salida', cantidad: 6 }, { existencia: 5 }),
    (e) => e instanceof DomainError && e.code === 'STOCK_INSUFICIENTE' && e.status === 409
  );
  // Vaciar el inventario exacto sí se permite.
  assert.equal(validarMovimiento({ tipo: 'salida', cantidad: 5 }, { existencia: 5 }), 5);
});

test('empleado sólo puede registrar salidas', () => {
  assert.throws(
    () => validarMovimiento({ tipo: 'entrada', cantidad: 5 }, { soloSalida: true }),
    (e) => e.code === 'MOV_SOLO_SALIDA' && e.status === 403
  );
  assert.equal(validarMovimiento({ tipo: 'salida', cantidad: 2 }, { existencia: 4, soloSalida: true }), 2);
});

test('cantidades inválidas y tipos fuera de catálogo', () => {
  assert.throws(() => validarMovimiento({ tipo: 'prestamo', cantidad: 1 }), (e) => e.code === 'MOV_TIPO_INVALIDO');
  assert.throws(() => validarMovimiento({ tipo: 'entrada', cantidad: 0 }), (e) => e.code === 'MOV_CANTIDAD_INVALIDA');
  assert.throws(() => validarMovimiento({ tipo: 'salida', cantidad: -3 }, { existencia: 10 }), (e) => e.code === 'MOV_CANTIDAD_INVALIDA');
  assert.throws(() => validarMovimiento({ tipo: 'ajuste', cantidad: 0 }), (e) => e.code === 'MOV_CANTIDAD_INVALIDA');
  assert.equal(validarMovimiento({ tipo: 'ajuste', cantidad: -4 }), -4, 'ajuste negativo permitido');
});

test('bajoMinimo sólo aplica con mínimo configurado', () => {
  const item = PrintItem.crear({ nombre: 'Tarjetas', minimo: 10 });
  assert.equal(item.bajoMinimo(11), false);
  assert.equal(item.bajoMinimo(10), true, 'llegar al mínimo enciende la alerta');
  assert.equal(item.bajoMinimo(0), true);
  const sinMinimo = PrintItem.crear({ nombre: 'Souvenirs' });
  assert.equal(sinMinimo.bajoMinimo(0), false);
});

// ---------- Infraestructura sin AWS: llaves S3 y decode ----------

test('S3Storage sin variables queda apagado y falla con S3_OFF sin importar el SDK', async () => {
  const s3 = new S3Storage({});
  assert.equal(s3.configured(), false);
  await assert.rejects(
    () => s3.putObject('k', Buffer.alloc(1), 'image/png'),
    (e) => e instanceof DomainError && e.code === 'S3_OFF' && e.status === 409
  );
  await assert.rejects(() => s3.presignGet('k'), (e) => e.code === 'S3_OFF');
});

test('configured() exige modo s3 + bucket + llaves', () => {
  const ok = new S3Storage({
    S3_MODE: 's3',
    S3_BUCKET: 'mallatex',
    S3_ACCESS_KEY_ID: 'AK',
    S3_SECRET_ACCESS_KEY: 'SK',
  });
  assert.equal(ok.configured(), true);
  const sinBucket = new S3Storage({ S3_MODE: 's3', S3_ACCESS_KEY_ID: 'AK', S3_SECRET_ACCESS_KEY: 'SK' });
  assert.equal(sinBucket.configured(), false);
});

test('keyForAsset: marketing/assets/<id>-<slug>.<ext>', () => {
  assert.equal(keyForAsset(7, 'Promo Verano Á', 'video/mp4'), 'marketing/assets/7-promo-verano-a.mp4');
  assert.equal(keyForAsset(9, '¡¡¡!!!', 'image/jpeg'), 'marketing/assets/9-activo.jpg');
  assert.equal(keyForAsset(3, 'Raro', 'application/x-cosa'), 'marketing/assets/3-raro.xcosa');
  assert.equal(slug('Ficha Técnica — Antigranizo'), 'ficha-tecnica-antigranizo');
});

test('decodeDataUrl acepta cualquier MIME y reporta el tamaño', () => {
  const png = decodeDataUrl(`data:image/png;base64,${Buffer.from('hola').toString('base64')}`);
  assert.equal(png.mime, 'image/png');
  assert.equal(png.sizeBytes, 4);
  const pdf = decodeDataUrl(`data:application/pdf;base64,${Buffer.from('pdf!').toString('base64')}`);
  assert.equal(pdf.mime, 'application/pdf');
  assert.equal(decodeDataUrl('no-es-dataurl'), null);
  assert.equal(decodeDataUrl(''), null);
});

// ---------- FieldPost: aportes de campo (vendedor -> marketing) ----------

test('Folio.fieldPost genera APC-#### con relleno', () => {
  assert.equal(Folio.fieldPost(1).value, 'APC-0001');
  assert.equal(Folio.fieldPost(273).value, 'APC-0273');
});

test('FieldPost.crear exige título y autor', () => {
  assert.throws(() => FieldPost.crear({ titulo: '' }, { autor: 'Ana' }), DomainError);
  assert.throws(() => FieldPost.crear({ titulo: 'Proyecto' }, { autor: '' }), DomainError);
  const fp = FieldPost.crear(
    { titulo: 'Cierre antigranizo', ubicacion: 'Jocotepec', cultivo: 'Zarzamora' },
    { autorId: 2, autor: 'Ana López' }
  );
  assert.equal(fp.estado, 'nuevo');
  assert.equal(fp.autorId, 2);
  assert.equal(fp.cultivo, 'Zarzamora');
});

test('FieldPost: máquina de estados nuevo -> aprobado -> publicado', () => {
  const fp = FieldPost.crear({ titulo: 'P' }, { autorId: 1, autor: 'Ana' });
  fp.cambiarEstado('aprobado', { notaMarketing: 'Va' });
  assert.equal(fp.estado, 'aprobado');
  assert.equal(fp.notaMarketing, 'Va');
  fp.cambiarEstado('publicado', { assetIds: [10, 11] });
  assert.equal(fp.estado, 'publicado');
  assert.deepEqual(fp.publicadoAssetIds, [10, 11]);
});

test('FieldPost: transición inválida nuevo -> publicado lanza 409', () => {
  const fp = FieldPost.crear({ titulo: 'P' }, { autorId: 1, autor: 'Ana' });
  assert.throws(() => fp.cambiarEstado('publicado'), (e) => e instanceof DomainError && e.status === 409);
});

test('FieldPost: sólo el autor puede reconocerse como dueño', () => {
  const fp = FieldPost.crear({ titulo: 'P' }, { autorId: 7, autor: 'Ana' });
  assert.equal(fp.esDe(7), true);
  assert.equal(fp.esDe(8), false);
});
