export function isHex(s: string): boolean {
  return /^[0-9a-fA-F]*$/.test(s);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

export function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== 'string') throw new Error('invalid_hex: not a string');
  if (hex.length % 2 !== 0) throw new Error('invalid_hex: odd length');
  if (!isHex(hex)) throw new Error('invalid_hex: non-hex chars');
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

