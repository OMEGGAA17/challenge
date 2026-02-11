import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { TxSecureRecord } from '@mirfa/types';
import { bytesToHex, hexToBytes } from './hex.js';
import { assertBytesLen } from './validation.js';

export type Aes256GcmEncrypted = {
  nonce: Uint8Array; // 12 bytes
  ct: Uint8Array;
  tag: Uint8Array; // 16 bytes
};

const ALG = 'AES-256-GCM' as const;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const DEK_BYTES = 32;
const MK_BYTES = 32;

function aes256gcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Aes256GcmEncrypted {
  assertBytesLen(key, 32, 'key');
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { nonce, ct: new Uint8Array(ct), tag: new Uint8Array(tag) };
}

function aes256gcmDecrypt(key: Uint8Array, enc: Aes256GcmEncrypted): Uint8Array {
  assertBytesLen(key, 32, 'key');
  assertBytesLen(enc.nonce, NONCE_BYTES, 'nonce');
  assertBytesLen(enc.tag, TAG_BYTES, 'tag');
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, enc.nonce);
    decipher.setAuthTag(Buffer.from(enc.tag));
    const pt = Buffer.concat([decipher.update(Buffer.from(enc.ct)), decipher.final()]);
    return new Uint8Array(pt);
  } catch {
    throw new Error('decrypt_failed');
  }
}

export function newDek(): Uint8Array {
  return randomBytes(DEK_BYTES);
}

export function parseMasterKeyHex(masterKeyHex: string): Uint8Array {
  const mk = hexToBytes(masterKeyHex);
  assertBytesLen(mk, MK_BYTES, 'master_key');
  return mk;
}

export function encryptPayloadWithDek(payloadObj: unknown, dek: Uint8Array): Aes256GcmEncrypted {
  assertBytesLen(dek, DEK_BYTES, 'dek');
  const payloadJson = JSON.stringify(payloadObj);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  return aes256gcmEncrypt(dek, payloadBytes);
}

export function decryptPayloadWithDek(enc: Aes256GcmEncrypted, dek: Uint8Array): unknown {
  assertBytesLen(dek, DEK_BYTES, 'dek');
  const pt = aes256gcmDecrypt(dek, enc);
  const s = new TextDecoder().decode(pt);
  try {
    return JSON.parse(s);
  } catch {
    // If this fails, treat as decryption failure (corruption/tamper).
    throw new Error('decrypt_failed');
  }
}

export function wrapDekWithMasterKey(dek: Uint8Array, masterKey: Uint8Array): Aes256GcmEncrypted {
  assertBytesLen(dek, DEK_BYTES, 'dek');
  assertBytesLen(masterKey, MK_BYTES, 'master_key');
  return aes256gcmEncrypt(masterKey, dek);
}

export function unwrapDekWithMasterKey(encWrappedDek: Aes256GcmEncrypted, masterKey: Uint8Array): Uint8Array {
  assertBytesLen(masterKey, MK_BYTES, 'master_key');
  const dek = aes256gcmDecrypt(masterKey, encWrappedDek);
  assertBytesLen(dek, DEK_BYTES, 'dek');
  return dek;
}

export function buildTxSecureRecordFields(args: {
  partyId: string;
  payload: unknown;
  masterKey: Uint8Array;
  mk_version: 1;
}): Omit<TxSecureRecord, 'id' | 'createdAt'> {
  const dek = newDek();
  const payloadEnc = encryptPayloadWithDek(args.payload, dek);
  const dekWrapped = wrapDekWithMasterKey(dek, args.masterKey);

  return {
    partyId: args.partyId,
    payload_nonce: bytesToHex(payloadEnc.nonce),
    payload_ct: bytesToHex(payloadEnc.ct),
    payload_tag: bytesToHex(payloadEnc.tag),
    dek_wrap_nonce: bytesToHex(dekWrapped.nonce),
    dek_wrapped: bytesToHex(dekWrapped.ct),
    dek_wrap_tag: bytesToHex(dekWrapped.tag),
    alg: ALG,
    mk_version: args.mk_version,
  };
}

export function decryptTxSecureRecord(record: TxSecureRecord, masterKey: Uint8Array): unknown {
  if (record.alg !== ALG) throw new Error('unsupported_alg');
  if (record.mk_version !== 1) throw new Error('unsupported_mk_version');

  const payload_nonce = hexToBytes(record.payload_nonce);
  const payload_tag = hexToBytes(record.payload_tag);
  const payload_ct = hexToBytes(record.payload_ct);
  assertBytesLen(payload_nonce, NONCE_BYTES, 'payload_nonce');
  assertBytesLen(payload_tag, TAG_BYTES, 'payload_tag');

  const dek_wrap_nonce = hexToBytes(record.dek_wrap_nonce);
  const dek_wrap_tag = hexToBytes(record.dek_wrap_tag);
  const dek_wrapped = hexToBytes(record.dek_wrapped);
  assertBytesLen(dek_wrap_nonce, NONCE_BYTES, 'dek_wrap_nonce');
  assertBytesLen(dek_wrap_tag, TAG_BYTES, 'dek_wrap_tag');

  const dek = unwrapDekWithMasterKey(
    { nonce: dek_wrap_nonce, ct: dek_wrapped, tag: dek_wrap_tag },
    masterKey,
  );
  return decryptPayloadWithDek({ nonce: payload_nonce, ct: payload_ct, tag: payload_tag }, dek);
}

