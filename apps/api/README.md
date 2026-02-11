## API (Fastify)

### Endpoints
- `POST /tx/encrypt`
  - Body: `{ "partyId": "party_123", "payload": { ...any json... } }`
  - Returns: `TxSecureRecord` (encrypted record; hex fields)
- `GET /tx/:id`
  - Returns: `TxSecureRecord` (no decryption)
- `POST /tx/:id/decrypt`
  - Returns: `{ id, partyId, payload }`

### Local dev
Create `apps/api/.env` (or set env vars in your shell):
- `MIRFA_MASTER_KEY_HEX` = 64 hex chars (32 bytes)
- Optional durable storage:
  - `TURSO_DATABASE_URL`
  - `TURSO_AUTH_TOKEN`

Run:

```bash
pnpm -C apps/api dev
```

### Vercel
- Deploy with root directory `apps/api`.
- Ensure env vars are set (`MIRFA_MASTER_KEY_HEX` required).
- `vercel.json` routes all paths to `api/index.ts`.

