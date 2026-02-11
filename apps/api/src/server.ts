import { loadEnv } from './env.js';
import { makeStore } from './storage.js';
import { buildApp } from './app.js';

async function main() {
  const env = loadEnv();
  const store = makeStore(env);
  await store.init();

  const app = buildApp({ env, store });
  await app.listen({ port: 3001, host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

