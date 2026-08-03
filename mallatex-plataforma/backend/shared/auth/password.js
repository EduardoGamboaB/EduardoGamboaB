import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/** Hash de contraseña/PIN con scrypt en formato `salt:hash` (hex). */
export async function hashSecret(plain) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(plain), salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifySecret(plain, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const derived = await scryptAsync(String(plain), salt, 64);
  const hashBuf = Buffer.from(hash, 'hex');
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}
