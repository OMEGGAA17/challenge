import type { TxSecureRecord } from '@mirfa/types';
import { createClient, type Client } from '@libsql/client';

export interface TxStore {
  init(): Promise<void>;
  put(record: TxSecureRecord): Promise<void>;
  get(id: string): Promise<TxSecureRecord | null>;
}

export class InMemoryTxStore implements TxStore {
  private map = new Map<string, TxSecureRecord>();
  async init(): Promise<void> {}
  async put(record: TxSecureRecord): Promise<void> {
    this.map.set(record.id, record);
  }
  async get(id: string): Promise<TxSecureRecord | null> {
    return this.map.get(id) ?? null;
  }
}

export class LibsqlTxStore implements TxStore {
  private client: Client;

  constructor(args: { url: string; authToken?: string }) {
    this.client = createClient({ url: args.url, authToken: args.authToken });
  }

  async init(): Promise<void> {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS tx_secure_records (
        id TEXT PRIMARY KEY,
        partyId TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        payload_nonce TEXT NOT NULL,
        payload_ct TEXT NOT NULL,
        payload_tag TEXT NOT NULL,
        dek_wrap_nonce TEXT NOT NULL,
        dek_wrapped TEXT NOT NULL,
        dek_wrap_tag TEXT NOT NULL,
        alg TEXT NOT NULL,
        mk_version INTEGER NOT NULL
      );
    `);
  }

  async put(r: TxSecureRecord): Promise<void> {
    await this.client.execute({
      sql: `
        INSERT INTO tx_secure_records (
          id, partyId, createdAt,
          payload_nonce, payload_ct, payload_tag,
          dek_wrap_nonce, dek_wrapped, dek_wrap_tag,
          alg, mk_version
        ) VALUES (
          ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
        ON CONFLICT(id) DO UPDATE SET
          partyId=excluded.partyId,
          createdAt=excluded.createdAt,
          payload_nonce=excluded.payload_nonce,
          payload_ct=excluded.payload_ct,
          payload_tag=excluded.payload_tag,
          dek_wrap_nonce=excluded.dek_wrap_nonce,
          dek_wrapped=excluded.dek_wrapped,
          dek_wrap_tag=excluded.dek_wrap_tag,
          alg=excluded.alg,
          mk_version=excluded.mk_version;
      `,
      args: [
        r.id,
        r.partyId,
        r.createdAt,
        r.payload_nonce,
        r.payload_ct,
        r.payload_tag,
        r.dek_wrap_nonce,
        r.dek_wrapped,
        r.dek_wrap_tag,
        r.alg,
        r.mk_version,
      ],
    });
  }

  async get(id: string): Promise<TxSecureRecord | null> {
    const rs = await this.client.execute({
      sql: `SELECT * FROM tx_secure_records WHERE id = ? LIMIT 1;`,
      args: [id],
    });
    const row = rs.rows[0] as any | undefined;
    if (!row) return null;

    return {
      id: String(row.id),
      partyId: String(row.partyId),
      createdAt: String(row.createdAt),
      payload_nonce: String(row.payload_nonce),
      payload_ct: String(row.payload_ct),
      payload_tag: String(row.payload_tag),
      dek_wrap_nonce: String(row.dek_wrap_nonce),
      dek_wrapped: String(row.dek_wrapped),
      dek_wrap_tag: String(row.dek_wrap_tag),
      alg: 'AES-256-GCM',
      mk_version: 1,
    };
  }
}

export function makeStore(env: { tursoUrl?: string; tursoAuthToken?: string }): TxStore {
  if (env.tursoUrl) return new LibsqlTxStore({ url: env.tursoUrl, authToken: env.tursoAuthToken });
  return new InMemoryTxStore();
}

