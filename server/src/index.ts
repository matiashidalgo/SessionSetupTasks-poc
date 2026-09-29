import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { InMemoryTaskRepository } from './tasks/memory.repository.js';

const config = loadConfig();
const app = await buildApp({ repository: new InMemoryTaskRepository(), logger: true });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
