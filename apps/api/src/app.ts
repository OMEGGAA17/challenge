import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { TxSecureRecord } from '@mirfa/types';
import { buildTxSecureRecordFields, decryptTxSecureRecord } from '@mirfa/crypto';
import type { ApiEnv } from './env.js';
import type { TxStore } from './storage.js';

const EncryptBody = z.object({
  partyId: z.string().min(1),
  payload: z.unknown(),
});

export function buildApp(args: { env: ApiEnv; store: TxStore }): FastifyInstance {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  app.setErrorHandler((err, _req, reply) => {
    const message = (err as any)?.message || 'internal_error';
    const statusCode = message.startsWith('Missing ') ? 500 : 400;
    reply.status(statusCode).send({ error: message });
  });

  app.get('/health', async () => ({ ok: true }));

  app.post('/tx/encrypt', async (req, reply) => {
    const parsed = EncryptBody.safeParse(req.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'invalid_input', issues: parsed.error.issues });
      return;
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();

    const fields = buildTxSecureRecordFields({
      partyId: parsed.data.partyId,
      payload: parsed.data.payload,
      masterKey: args.env.masterKey,
      mk_version: args.env.mkVersion,
    });

    const record: TxSecureRecord = { id, createdAt, ...fields };
    await args.store.put(record);
    reply.send(record);
  });

  app.get('/tx/:id', async (req, reply) => {
    const id = (req.params as any).id as string;
    const record = await args.store.get(id);
    if (!record) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }
    reply.send(record);
  });

  app.post('/tx/:id/decrypt', async (req, reply) => {
    const id = (req.params as any).id as string;
    const record = await args.store.get(id);
    if (!record) {
      reply.status(404).send({ error: 'not_found' });
      return;
    }

    try {
      const payload = decryptTxSecureRecord(record, args.env.masterKey);
      reply.send({ id: record.id, partyId: record.partyId, payload });
    } catch (e) {
      reply.status(400).send({ error: (e as Error).message || 'decrypt_failed' });
    }
  });

  return app;
}

