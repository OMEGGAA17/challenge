import { describe, expect, test } from 'vitest';
import { buildTxSecureRecordFields, decryptTxSecureRecord, parseMasterKeyHex } from '../src/tx.js';
import type { TxSecureRecord } from '@mirfa/types';

function mkHex() {
  // 32 bytes => 64 hex chars
  return '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
}

function makeRecord(overrides?: Partial<TxSecureRecord>): TxSecureRecord {
  const fields = buildTxSecureRecordFields({
    partyId: 'party_123',
    payload: { amount: 100, currency: 'AED' },
    masterKey: parseMasterKeyHex(mkHex()),
    mk_version: 1,
  });

  return {
    id: 'tx_1',
    partyId: fields.partyId,
    createdAt: new Date().toISOString(),
    ...fields,
    ...overrides,
  };
}

describe('envelope encryption', () => {
  test('encrypt -> decrypt roundtrip works', () => {
    const record = makeRecord();
    const payload = decryptTxSecureRecord(record, parseMasterKeyHex(mkHex()));
    expect(payload).toEqual({ amount: 100, currency: 'AED' });
  });

  test('tampered payload ciphertext fails', () => {
    const record = makeRecord();
    const tampered = record.payload_ct.slice(0, -2) + (record.payload_ct.slice(-2) === '00' ? '01' : '00');
    expect(() =>
      decryptTxSecureRecord({ ...record, payload_ct: tampered }, parseMasterKeyHex(mkHex())),
    ).toThrow(/decrypt_failed|invalid_hex|invalid_length/);
  });

  test('tampered payload tag fails', () => {
    const record = makeRecord();
    const tampered = record.payload_tag.slice(0, -2) + (record.payload_tag.slice(-2) === '00' ? '01' : '00');
    expect(() =>
      decryptTxSecureRecord({ ...record, payload_tag: tampered }, parseMasterKeyHex(mkHex())),
    ).toThrow(/decrypt_failed|invalid_hex|invalid_length/);
  });

  test('wrong nonce length fails', () => {
    const record = makeRecord({ payload_nonce: '00' }); // 1 byte
    expect(() => decryptTxSecureRecord(record, parseMasterKeyHex(mkHex()))).toThrow(/invalid_length/);
  });

  test('invalid hex fails', () => {
    const record = makeRecord({ dek_wrap_tag: 'zz' });
    expect(() => decryptTxSecureRecord(record, parseMasterKeyHex(mkHex()))).toThrow(/invalid_hex/);
  });
});

