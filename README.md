## Mirfa Secure Transactions Mini-App

Monorepo with:
- `apps/web`: Next.js UI
- `apps/api`: Fastify API (Vercel serverless-compatible)
- `packages/crypto`: Envelope encryption (AES-256-GCM) + validation
- `packages/types`: Shared types

### Encryption (Envelope Encryption, AES-256-GCM)
- Generate random **DEK** (32 bytes)
- Encrypt payload (JSON bytes) using DEK with **AES-256-GCM**
- Wrap DEK using **Master Key** (32 bytes, from `MIRFA_MASTER_KEY_HEX`) with **AES-256-GCM**
- Store everything as hex strings in `TxSecureRecord`

Validation rejects:
- invalid hex
- nonce not 12 bytes
- tag not 16 bytes
- any AES-GCM auth failure (`decrypt_failed`)

### Local dev
1. Install dependencies:

```bash
pnpm install
```

2. Run both apps:

```bash
pnpm dev
```

Backup if error comes: 
go to challenge-main\apps\api and then do pnpm dev (if for some reason backend is giving error along with pnpm dev in the challenge-main\

### Environment variables

#### API (`apps/api/.env`)
- `MIRFA_MASTER_KEY_HEX`: **64 hex chars** (= 32 bytes)
- `TURSO_DATABASE_URL`: Turso/libSQL URL (optional for local; falls back to in-memory)
- `TURSO_AUTH_TOKEN`: Turso token (optional for local; falls back to in-memory)

#### Web (`apps/web/.env.local`)
- `NEXT_PUBLIC_API_BASE_URL`: e.g. `http://localhost:3001` for local, or your deployed API URL.

### Deploy to Vercel
- Create **two** Vercel projects:
  - Web: root directory `apps/web`
  - API: root directory `apps/api`
- Set env vars listed above.

### Loom video talking points
- https://www.loom.com/share/a46bc95a4c0343dc93b7f44bd7e27681

