import { hexToBytes } from './hex.js';

export function assertBytesLen(bytes: Uint8Array, expected: number, what: string): void {
  if (bytes.length !== expected) {
    throw new Error(`invalid_length: ${what} must be ${expected} bytes`);
  }
}

export function assertHexBytesLen(hex: string, expectedBytes: number, what: string): void {
  const bytes = hexToBytes(hex);
  assertBytesLen(bytes, expectedBytes, what);
}

export function safeJsonParse(s: string): unknown {
  return JSON.parse(s);
}

