import { test } from 'node:test';
import assert from 'node:assert/strict';

import { generarFolio, generarFolioUnico, ALFABETO_FOLIO } from '../src/domain/folio.js';
import { Raffle } from '../src/domain/Raffle.js';
import { Event } from '../src/domain/Event.js';
import { Lead } from '../src/domain/Lead.js';
import { DomainError } from '@mallatex/shared/ddd';

// ---------- folio ----------

test('alphabet excludes ambiguous characters (0, O, 1, I, L?)', () => {
  for (const ch of ['0', 'O', '1', 'I']) {
    assert.equal(ALFABETO_FOLIO.includes(ch), false, `alphabet must not contain ${ch}`);
  }
  assert.equal(new Set(ALFABETO_FOLIO).size, ALFABETO_FOLIO.length, 'no duplicates');
});

test('generarFolio: ANB- prefix + 6 chars from the safe alphabet', () => {
  for (let i = 0; i < 50; i++) {
    const f = generarFolio();
    assert.match(f, /^ANB-[A-Z2-9]{6}$/);
    for (const ch of f.slice(4)) {
      assert.ok(ALFABETO_FOLIO.includes(ch), `char ${ch} not in alphabet`);
    }
  }
});

test('generarFolioUnico retries until the folio does not exist', async () => {
  const seen = [];
  let calls = 0;
  const existe = async (f) => { seen.push(f); return ++calls < 3; }; // first 2 collide
  const folio = await generarFolioUnico(existe);
  assert.equal(seen.length, 3);
  assert.equal(folio, seen[2]);
  assert.match(folio, /^ANB-/);
});

test('generarFolioUnico falls back to a timestamp folio after 20 collisions', async () => {
  const folio = await generarFolioUnico(async () => true);
  assert.match(folio, /^ANB-[A-Z0-9]{6}$/);
});

// ---------- Raffle ----------

const eventA = { id: 1, permiteGanadoresPrevios: true };
const eventB = { id: 2, permiteGanadoresPrevios: true };

const leads = [
  { id: 10, eventId: 1, email: 'ana@x.com', telefono: '331', consentimiento: true },
  { id: 11, eventId: 1, email: '', telefono: '332', consentimiento: false },
  { id: 12, eventId: 1, email: 'luis@x.com', telefono: '333', consentimiento: true },
  { id: 20, eventId: 2, email: 'ana@x.com', telefono: '331', consentimiento: true }, // same person as 10
];

test('elegibles filters by event', () => {
  const pool = Raffle.elegibles(leads, [], eventA);
  assert.deepEqual(pool.map((l) => l.id), [10, 11, 12]);
});

test('soloConsentimiento excludes leads without consent', () => {
  const pool = Raffle.elegibles(leads, [], eventA, { soloConsentimiento: true });
  assert.deepEqual(pool.map((l) => l.id), [10, 12]);
});

test('previous winners in the same event are excluded by default', () => {
  const draws = [{ eventId: 1, leadId: 10 }];
  const pool = Raffle.elegibles(leads, draws, eventA);
  assert.deepEqual(pool.map((l) => l.id), [11, 12]);
});

test('evitarRepetidos=false lets in-event winners win again', () => {
  const draws = [{ eventId: 1, leadId: 10 }];
  const pool = Raffle.elegibles(leads, draws, eventA, { evitarRepetidos: false });
  assert.deepEqual(pool.map((l) => l.id), [10, 11, 12]);
});

test('cross-event winners excluded when permiteGanadoresPrevios=false', () => {
  // Ana won in event 2; sorting event 1 (which forbids previous winners)
  const strictEventA = { id: 1, permiteGanadoresPrevios: false };
  const draws = [{ eventId: 2, leadId: 20 }];
  const pool = Raffle.elegibles(leads, draws, strictEventA);
  assert.deepEqual(pool.map((l) => l.id), [11, 12], 'lead 10 is the same person by email');
});

test('cross-event winners allowed when permiteGanadoresPrevios=true', () => {
  const draws = [{ eventId: 2, leadId: 20 }];
  const pool = Raffle.elegibles(leads, draws, eventA);
  assert.deepEqual(pool.map((l) => l.id), [10, 11, 12]);
});

test('persona identity is keyed email → telefono → id', () => {
  assert.equal(Raffle.persona({ id: 1, email: 'A@X.com', telefono: '331' }), 'a@x.com');
  assert.equal(Raffle.persona({ id: 1, email: '', telefono: '331' }), '331');
  assert.equal(Raffle.persona({ id: 1, email: '', telefono: '' }), '1');
});

test('cross-event exclusion also matches by phone when email is missing', () => {
  const strictEvent = { id: 1, permiteGanadoresPrevios: false };
  const phoneLeads = [
    { id: 1, eventId: 1, email: '', telefono: '555' },
    { id: 2, eventId: 2, email: '', telefono: '555' },
  ];
  const draws = [{ eventId: 2, leadId: 2 }];
  assert.deepEqual(Raffle.elegibles(phoneLeads, draws, strictEvent), []);
});

test('sortear returns null for an empty pool and a member otherwise', () => {
  assert.equal(Raffle.sortear([]), null);
  const pool = [{ id: 1 }, { id: 2 }];
  assert.ok(pool.includes(Raffle.sortear(pool)));
});

// ---------- Event ----------

test('Event.create requires a non-blank name', () => {
  assert.throws(
    () => Event.create({ name: '   ' }),
    (e) => e instanceof DomainError && e.code === 'EVENT_NAME_REQUIRED'
  );
});

test('Event.create defaults and EventCreated emission', () => {
  const ev = Event.create({ name: '  Expo Agro  ' });
  assert.equal(ev.name, 'Expo Agro');
  assert.equal(ev.activo, false);
  assert.equal(ev.finalizado, false);
  assert.equal(ev.permiteGanadoresPrevios, true);
  assert.equal(ev.plazoContactoDias, 30);
  assert.equal(ev.vigente, true);
  const [e] = ev.pullDomainEvents();
  assert.equal(e.name, 'EventCreated');
});

test('activar / finalizar / reabrir transitions', () => {
  const ev = Event.create({ name: 'Expo' });
  ev.pullDomainEvents();

  ev.activar();
  assert.equal(ev.activo, true);
  assert.equal(ev.pullDomainEvents()[0].name, 'EventActivado');

  ev.finalizar();
  assert.equal(ev.finalizado, true);
  assert.equal(ev.vigente, false);
  assert.equal(ev.pullDomainEvents()[0].name, 'EventFinalizado');

  ev.reabrir();
  assert.equal(ev.finalizado, false);
  assert.equal(ev.vigente, true);

  ev.desactivar();
  assert.equal(ev.activo, false);
});

test('aplicar normalizes plazoContactoDias and boolean flags', () => {
  const ev = Event.create({ name: 'Expo' });
  ev.aplicar({ plazoContactoDias: '45 días', permiteGanadoresPrevios: 0, name: '' });
  assert.equal(ev.plazoContactoDias, 45);
  assert.equal(ev.permiteGanadoresPrevios, false);
  assert.equal(ev.name, 'Evento', 'blank name falls back to default');
  ev.aplicar({ plazoContactoDias: 'sin números' });
  assert.equal(ev.plazoContactoDias, 30, 'non-numeric falls back to 30');
});

test('toPublic hides internal flags', () => {
  const pub = Event.create({ name: 'Expo', activo: true }).toPublic();
  assert.equal('activo' in pub, false);
  assert.equal('finalizado' in pub, false);
  assert.equal('permiteGanadoresPrevios' in pub, false);
});

// ---------- Lead ----------

const validAuto = {
  eventId: 1,
  folio: 'ANB-ABC234',
  nombre: '  Juan Pérez ',
  email: 'JUAN@Empresa.com',
  telefono: '(33) 12-34-56-78',
  aceptaTerminos: true,
  aceptaPrivacidad: true,
};

test('autoregistro: valid data normalizes and stamps consent + folio', () => {
  const lead = Lead.autoregistro(validAuto);
  assert.equal(lead.folio, 'ANB-ABC234');
  assert.equal(lead.nombre, 'Juan Pérez');
  assert.equal(lead.email, 'juan@empresa.com');
  assert.equal(lead.telefono, '3312345678');
  assert.equal(lead.consentimiento, true);
  assert.equal(lead.aceptaTerminos, true);
  assert.equal(lead.aceptaPrivacidad, true);
  assert.ok(lead.consentimientoAt instanceof Date);
  assert.equal(lead.fuente, 'Autoregistro (QR)');
  assert.equal(lead.metodoCaptura, 'autoregistro');
  const [ev] = lead.pullDomainEvents();
  assert.equal(ev.name, 'LeadSelfRegistered');
  assert.equal(ev.payload.folio, 'ANB-ABC234');
});

test('autoregistro requires a 10-digit phone', () => {
  assert.throws(
    () => Lead.autoregistro({ ...validAuto, telefono: '123456789' }),
    (e) => e instanceof DomainError && e.code === 'LEAD_PHONE_INVALID'
  );
  assert.throws(
    () => Lead.autoregistro({ ...validAuto, telefono: '12345678901' }),
    (e) => e.code === 'LEAD_PHONE_INVALID'
  );
  assert.throws(() => Lead.autoregistro({ ...validAuto, telefono: '' }), (e) => e.code === 'LEAD_PHONE_INVALID');
});

test('autoregistro requires a valid email and a name', () => {
  assert.throws(
    () => Lead.autoregistro({ ...validAuto, email: 'no-arroba' }),
    (e) => e.code === 'LEAD_EMAIL_INVALID'
  );
  assert.throws(() => Lead.autoregistro({ ...validAuto, email: '' }), (e) => e.code === 'LEAD_EMAIL_INVALID');
  assert.throws(() => Lead.autoregistro({ ...validAuto, nombre: '  ' }), (e) => e.code === 'LEAD_NAME_REQUIRED');
});

test('autoregistro requires accepting both terms and privacy', () => {
  assert.throws(
    () => Lead.autoregistro({ ...validAuto, aceptaTerminos: false }),
    (e) => e instanceof DomainError && e.code === 'LEAD_CONSENT_REQUIRED'
  );
  assert.throws(
    () => Lead.autoregistro({ ...validAuto, aceptaPrivacidad: undefined }),
    (e) => e.code === 'LEAD_CONSENT_REQUIRED'
  );
});

test('capturarPorStaff: name plus at least one contact channel', () => {
  assert.throws(
    () => Lead.capturarPorStaff({ eventId: 1, folio: 'ANB-XXXXXX', nombre: '' }),
    (e) => e.code === 'LEAD_NAME_REQUIRED'
  );
  assert.throws(
    () => Lead.capturarPorStaff({ eventId: 1, folio: 'ANB-XXXXXX', nombre: 'Ana' }),
    (e) => e.code === 'LEAD_CONTACT_REQUIRED'
  );
  assert.throws(
    () => Lead.capturarPorStaff({ eventId: 1, folio: 'ANB-XXXXXX', nombre: 'Ana', email: 'mal' }),
    (e) => e.code === 'LEAD_EMAIL_INVALID'
  );
});

test('capturarPorStaff: phone-only capture is allowed, consent optional', () => {
  const lead = Lead.capturarPorStaff({
    eventId: 1,
    folio: 'ANB-ABC234',
    nombre: 'Ana',
    telefono: '33-11-22-33',
    fuente: 'Conferencia',
  });
  assert.equal(lead.telefono, '33112233');
  assert.equal(lead.consentimiento, false);
  assert.equal(lead.fuente, 'Conferencia');
  assert.equal(lead.metodoCaptura, 'manual');
  const [ev] = lead.pullDomainEvents();
  assert.equal(ev.name, 'LeadCaptured');
});
