import crypto from 'crypto';

function getKey(): Buffer {
  const b64 = process.env.ACTIVITY_NOTES_KEY;
  if (!b64) throw new Error('ACTIVITY_NOTES_KEY is missing');
  const key = Buffer.from(b64, 'base64');
  if (key.length !== 32) throw new Error('ACTIVITY_NOTES_KEY must be 32 bytes (base64)');
  return key;
}

export function encryptNote(plain: string): Buffer {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]); // iv(12)+tag(16)+ciphertext
}

export function decryptNote(packed: Buffer): string {
  const key = getKey();
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plain.toString('utf8');
}

export function hasNotesKey(): boolean {
  const b64 = process.env.ACTIVITY_NOTES_KEY;
  if (!b64) return false;
  try {
    const key = Buffer.from(b64, 'base64');
    return key.length === 32;
  } catch {
    return false;
  }
}
