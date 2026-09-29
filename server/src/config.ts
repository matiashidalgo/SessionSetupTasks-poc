export interface Config {
  host: string;
  port: number;
  /** SQLite file path, or `:memory:` for a non-persistent database. */
  dbPath: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    host: env.HOST ?? '127.0.0.1',
    port: Number(env.PORT ?? 3000),
    dbPath: env.DB_PATH ?? 'data/tasks.db',
  };
}
