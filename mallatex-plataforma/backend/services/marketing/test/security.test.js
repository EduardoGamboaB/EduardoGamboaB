import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAssetFile, decodeDataUrl } from '../src/infrastructure/images.js';
import { cleanUrl } from '../src/domain/Asset.js';

const dataUrl = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PDF = Buffer.from('%PDF-1.7\n...');
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.from('....')]);

test('acepta imagen PNG/JPG por magic bytes', () => {
  assert.equal(decodeAssetFile(dataUrl('image/png', PNG), 'imagen')?.mime, 'image/png');
  assert.equal(decodeAssetFile(dataUrl('image/jpeg', JPG), 'imagen')?.mime, 'image/jpeg');
});

test('persiste el MIME real, no el declarado', () => {
  // Declarado image/png pero contenido JPG → se guarda como image/jpeg.
  assert.equal(decodeAssetFile(dataUrl('image/png', JPG), 'imagen')?.mime, 'image/jpeg');
});

test('rechaza HTML disfrazado de documento (XSS)', () => {
  const html = Buffer.from('<html><script>alert(1)</script></html>');
  assert.equal(decodeAssetFile(dataUrl('text/html', html), 'documento'), null);
  assert.equal(decodeAssetFile(dataUrl('application/pdf', html), 'documento'), null);
});

test('rechaza SVG como imagen (XSS)', () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
  assert.equal(decodeAssetFile(dataUrl('image/svg+xml', svg), 'imagen'), null);
});

test('acepta documento PDF y video MP4 reales', () => {
  assert.equal(decodeAssetFile(dataUrl('application/pdf', PDF), 'documento')?.mime, 'application/pdf');
  assert.equal(decodeAssetFile(dataUrl('video/mp4', MP4), 'video')?.mime, 'video/mp4');
});

test('un video no puede subirse como imagen (tipo cruzado)', () => {
  assert.equal(decodeAssetFile(dataUrl('image/png', MP4), 'imagen'), null);
});

test('rechaza base64 gigante antes de decodificar', () => {
  // Cadena base64 que representa ~40 MB (> tope 30 MB): se rechaza sin materializar.
  const big = 'A'.repeat(Math.ceil((40 * 1024 * 1024 * 4) / 3));
  assert.equal(decodeDataUrl(`data:image/png;base64,${big}`), null);
});

test('cleanUrl solo admite http(s) con host', () => {
  assert.equal(cleanUrl('https://cdn.mallatex.mx/a.mp4'), 'https://cdn.mallatex.mx/a.mp4');
  assert.equal(cleanUrl(''), '');
  assert.throws(() => cleanUrl('javascript:alert(1)'));
  assert.throws(() => cleanUrl('data:text/html,<script>'));
  assert.throws(() => cleanUrl('file:///etc/passwd'));
});
