import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv } from '../src/env.js';
import { makeStore } from '../src/storage.js';
import { buildApp } from '../src/app.js';

let cached: { ready: Promise<void>; handler: (req: IncomingMessage, res: ServerResponse) => void } | null =
  null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!cached) {
    const env = loadEnv();
    const store = makeStore(env);
    cached = {
      ready: (async () => {
        await store.init();
        const app = buildApp({ env, store });
        await app.ready();
        cached = {
          ready: Promise.resolve(),
          handler: (r, s) => {
            app.server.emit('request', r, s);
          },
        };
      })(),
      handler: () => {},
    };
  }

  await cached.ready;
  cached.handler(req, res);
}

