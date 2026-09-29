import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { SqliteTaskRepository } from './tasks/sqlite.repository.js';

const config = loadConfig();
const repository = new SqliteTaskRepository(config.dbPath);
const app = await buildApp({ repository, logger: true });

app.addHook('onClose', () => {
  repository.close();
});

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
