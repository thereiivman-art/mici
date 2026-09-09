// Chiffrement local des données. Le code PIN de l'utilisateur dérive une clé
// AES-GCM (PBKDF2, 210k itérations) qui ne quitte jamais l'appareil et n'est
// jamais persistée : sans PIN correct, les données stockées sont illisibles.

const PBKDF2_ITERATIONS = 210_000;

function toBase64(buf: ArrayBufferLike): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(len: number): Uint8Array {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

export async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Empreinte non réversible du PIN, utilisée seulement pour vérifier une saisie
 * sans avoir à tenter un déchiffrement complet. */
export async function hashPin(pin: string, salt: Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const material = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    256,
  );
  return toBase64(bits);
}

export interface EncryptedPayload {
  iv: string;
  data: string;
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const enc = new TextEncoder();
  const plaintext = enc.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext);
  return { iv: toBase64(iv.buffer), data: toBase64(cipher) };
}

export async function decryptJSON<T>(key: CryptoKey, payload: EncryptedPayload): Promise<T> {
  const iv = fromBase64(payload.iv);
  const cipherBytes = fromBase64(payload.data);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipherBytes as BufferSource,
  );
  const dec = new TextDecoder();
  return JSON.parse(dec.decode(plainBuf)) as T;
}

export interface EncryptedBlob {
  iv: string;
  blob: Blob;
}

export async function encryptBlob(key: CryptoKey, source: Blob): Promise<EncryptedBlob> {
  const iv = randomBytes(12);
  const plaintext = await source.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext);
  return { iv: toBase64(iv.buffer), blob: new Blob([cipher]) };
}

export async function decryptBlob(
  key: CryptoKey,
  encrypted: EncryptedBlob,
  mimeType: string,
): Promise<Blob> {
  const iv = fromBase64(encrypted.iv);
  const cipherBuf = await encrypted.blob.arrayBuffer();
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    cipherBuf,
  );
  return new Blob([plainBuf], { type: mimeType });
}

export { toBase64, fromBase64 };
