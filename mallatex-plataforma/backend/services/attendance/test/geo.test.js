import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  haversineMeters,
  evaluateGeofence,
  euclidean,
  FACE_MATCH_THRESHOLD,
  matchByDescriptor,
} from '../src/domain/Geo.js';

// ---------- haversineMeters ----------

test('distance to the same point is 0', () => {
  assert.equal(haversineMeters(20.72, -103.39, 20.72, -103.39), 0);
});

test('1 degree of latitude ≈ 111,195 m', () => {
  const d = haversineMeters(20, -103, 21, -103);
  assert.ok(Math.abs(d - 111195) < 200, `expected ≈111195, got ${d}`);
});

test('Zapopan → Ensenada is on the order of 1.7e6 m', () => {
  const d = haversineMeters(20.72, -103.39, 31.87, -116.6);
  assert.ok(d > 1_400_000 && d < 2_100_000, `got ${d}`);
});

test('distance is symmetric and rounded to integer meters', () => {
  const a = haversineMeters(20.72, -103.39, 20.73, -103.4);
  const b = haversineMeters(20.73, -103.4, 20.72, -103.39);
  assert.equal(a, b);
  assert.equal(a, Math.round(a));
});

// ---------- evaluateGeofence ----------

const site = { lat: 20.72, lng: -103.39, radiusMeters: 150 };

test('point inside the geofence', () => {
  // ~111 m north of the site
  const r = evaluateGeofence(site, 20.721, -103.39);
  assert.equal(r.withinGeofence, true);
  assert.ok(r.distanceMeters > 0 && r.distanceMeters <= 150);
});

test('point outside the geofence', () => {
  const r = evaluateGeofence(site, 20.73, -103.39); // ~1.1 km away
  assert.equal(r.withinGeofence, false);
  assert.ok(r.distanceMeters > 150);
});

test('site without radius: distance yes, verdict null', () => {
  const r = evaluateGeofence({ lat: 20.72, lng: -103.39, radiusMeters: 0 }, 20.721, -103.39);
  assert.equal(r.withinGeofence, null);
  assert.ok(Number.isFinite(r.distanceMeters));
});

test('missing or invalid site coordinates → nulls', () => {
  assert.deepEqual(evaluateGeofence(null, 20, -103), { distanceMeters: null, withinGeofence: null });
  assert.deepEqual(evaluateGeofence({ lat: 'x', lng: -103 }, 20, -103), {
    distanceMeters: null,
    withinGeofence: null,
  });
});

// ---------- facial matching ----------

test('euclidean distance: classic 3-4-5 triangle', () => {
  assert.equal(euclidean([0, 0], [3, 4]), 5);
  assert.equal(euclidean([1, 1, 1], [1, 1, 1]), 0);
});

test('FACE_MATCH_THRESHOLD is 0.5', () => {
  assert.equal(FACE_MATCH_THRESHOLD, 0.5);
});

test('matchByDescriptor finds the closest enrolled employee under threshold', () => {
  const target = Array(128).fill(0.5);
  const near = { id: 1, name: 'Near', faceDescriptor: Array(128).fill(0.51) }; // dist ≈ 0.113
  const far = { id: 2, name: 'Far', faceDescriptor: Array(128).fill(0.9) };
  const inactive = { id: 3, active: false, faceDescriptor: Array(128).fill(0.5) };
  const badLength = { id: 4, faceDescriptor: [0.5, 0.5] };

  const m = matchByDescriptor(target, [far, near, inactive, badLength]);
  assert.equal(m.employee.id, 1);
  assert.ok(m.distance < FACE_MATCH_THRESHOLD);
});

test('matchByDescriptor returns null when best match exceeds threshold', () => {
  const target = Array(128).fill(0);
  const employees = [{ id: 1, faceDescriptor: Array(128).fill(1) }];
  assert.equal(matchByDescriptor(target, employees), null);
});
