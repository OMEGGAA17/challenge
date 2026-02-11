import 'dotenv/config';
import { parseMasterKeyHex } from '@mirfa/crypto';

export type ApiEnv = {
  masterKey: Uint8Array;
  mkVersion: 1;
  tursoUrl?: string;
  tursoAuthToken?: string;
};

export function loadEnv(): ApiEnv {
  const mkHex = process.env.MIRFA_MASTER_KEY_HEX || '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
  if (!mkHex) {
    throw new Error('Missing MIRFA_MASTER_KEY_HEX (must be 64 hex chars)');
  }
  const masterKey = parseMasterKeyHex(mkHex);
  const mkVersion = 1 as const;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  return { masterKey, mkVersion, tursoUrl, tursoAuthToken };
}

