import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { InMemoryTaskRepository } from '../src/tasks/memory.repository.js';
import { TASKS_URL, createTestApp, expectError } from './helpers.js';

let app: FastifyInstance;

afterEach(async () => {
  await app.close();
});

describe('app', () => {
  it('hides internal error details from clients', async () => {
    const repository = new InMemoryTaskRepository();
    repository.list = () => Promise.reject(new Error('database file is locked'));
    app = await createTestApp(repository);

    const error = await expectError(app, { url: TASKS_URL }, 500, 'INTERNAL_ERROR');

    expect(error.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(error)).not.toContain('locked');
  });

  it('publishes an OpenAPI document covering every operation', async () => {
    app = await createTestApp();
    const res = await app.inject({ url: '/docs/json' });

    expect(res.statusCode).toBe(200);
    const spec = res.json<{ paths: Record<string, Record<string, { operationId: string }>> }>();
    const operations = Object.values(spec.paths)
      .flatMap((methods) => Object.values(methods).map((op) => op.operationId))
      .sort();
    expect(operations).toEqual(['createTask', 'deleteTask', 'getTask', 'listTasks', 'updateTask']);
  });
});
