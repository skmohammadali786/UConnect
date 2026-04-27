import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "@uconnect_chat_keypair_v1_";
const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export interface StoredChatKeyPair {
  publicKeyRaw: string;
  privateKeyJwk: JsonWebKey;
}

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const a = bytes[i++] ?? 0;
    const b = bytes[i++] ?? 0;
    const c = bytes[i++] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    out += BASE64_CHARS[(triplet >> 18) & 63];
    out += BASE64_CHARS[(triplet >> 12) & 63];
    out += i - 2 < bytes.length ? BASE64_CHARS[(triplet >> 6) & 63] : "=";
    out += i - 1 < bytes.length ? BASE64_CHARS[triplet & 63] : "=";
  }
  return out;
}

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, "");
  let buffer = 0;
  let bits = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 1) {
    const value = BASE64_CHARS.indexOf(clean[i]);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer as ArrayBuffer;
}

function getSubtle() {
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("WebCrypto API is not available for E2EE.");
  }
  return globalThis.crypto.subtle;
}

export async function ensureChatKeyPair(userId: string): Promise<StoredChatKeyPair> {
  const subtle = getSubtle();
  const key = KEY_PREFIX + userId;
  const existing = await AsyncStorage.getItem(key);
  if (existing) {
    const parsed = JSON.parse(existing) as StoredChatKeyPair;
    if (parsed.publicKeyRaw && parsed.privateKeyJwk) return parsed;
  }

  const pair = await subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const publicRaw = await subtle.exportKey("raw", pair.publicKey);
  const privateJwk = await subtle.exportKey("jwk", pair.privateKey);
  const stored: StoredChatKeyPair = {
    publicKeyRaw: bytesToBase64(new Uint8Array(publicRaw)),
    privateKeyJwk: privateJwk,
  };
  await AsyncStorage.setItem(key, JSON.stringify(stored));
  return stored;
}

export async function importPrivateKeyFromJwk(jwk: JsonWebKey): Promise<CryptoKey> {
  const subtle = getSubtle();
  return subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey", "deriveBits"],
  );
}

export async function importPublicKeyFromRaw(base64Raw: string): Promise<CryptoKey> {
  const subtle = getSubtle();
  const rawBytes = base64ToBytes(base64Raw);
  const raw = toArrayBuffer(rawBytes);
  return subtle.importKey(
    "raw",
    raw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
}

async function deriveAesKey(privateKey: CryptoKey, otherPublicKey: CryptoKey): Promise<CryptoKey> {
  const subtle = getSubtle();
  return subtle.deriveKey(
    { name: "ECDH", public: otherPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptChatMessage(
  message: string,
  privateKeyJwk: JsonWebKey,
  otherPartyPublicRaw: string,
): Promise<{ cipherText: string; iv: string; version: number }> {
  const subtle = getSubtle();
  const privateKey = await importPrivateKeyFromJwk(privateKeyJwk);
  const otherPublic = await importPublicKeyFromRaw(otherPartyPublicRaw);
  const aesKey = await deriveAesKey(privateKey, otherPublic);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(message);
  const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, aesKey, data);
  return {
    cipherText: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
    version: 1,
  };
}

export async function decryptChatMessage(
  cipherText: string,
  iv: string,
  privateKeyJwk: JsonWebKey,
  otherPartyPublicRaw: string,
): Promise<string | null> {
  try {
    const subtle = getSubtle();
    const privateKey = await importPrivateKeyFromJwk(privateKeyJwk);
    const otherPublic = await importPublicKeyFromRaw(otherPartyPublicRaw);
    const aesKey = await deriveAesKey(privateKey, otherPublic);
    const ivBytes = base64ToBytes(iv);
    const ivBuffer = toArrayBuffer(ivBytes);
    const cipherBytes = base64ToBytes(cipherText);
    const cipherBuffer = toArrayBuffer(cipherBytes);
    const decrypted = await subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      cipherBuffer,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}
