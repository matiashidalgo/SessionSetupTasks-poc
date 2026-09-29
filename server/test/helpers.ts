import type { FastifyInstance, InjectOptions } from 'fastify';
import type { TSchema } from 'typebox';
import { Value } from 'typebox/value';
import { expect } from 'vitest';
import { buildApp } from '../src/app.js';
import { ErrorResponseSchema, type ErrorResponse } from '../src/errors.js';
import { InMemoryTaskRepository } from '../src/tasks/memory.repository.js';
import type { TaskRepository } from '../src/tasks/task.repository.js';
import type { Task } from '../src/tasks/task.schema.js';

export const TASKS_URL = '/api/v1/tasks';
export const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

export async function createTestApp(
  repository: TaskRepository = new InMemoryTaskRepository(),
): Promise<FastifyInstance> {
  const app = await buildApp({ repository });
  await app.ready();
  return app;
}

/** Asserts `value` conforms to `schema`; on failure the diff lists each schema violation. */
export function expectSchema(schema: TSchema, value: unknown): void {
  expect(Value.Errors(schema, value)).toEqual([]);
}

export async function createTask(app: FastifyInstance, title: string): Promise<Task> {
  const res = await app.inject({ method: 'POST', url: TASKS_URL, payload: { title } });
  expect(res.statusCode).toBe(201);
  return res.json<Task>();
}

/** Sends the request and asserts a uniform error body with the given status and code. */
export async function expectError(
  app: FastifyInstance,
  request: InjectOptions,
  statusCode: number,
  code: string,
): Promise<ErrorResponse['error']> {
  const res = await app.inject(request);
  expect(res.statusCode).toBe(statusCode);
  const body = res.json<ErrorResponse>();
  expectSchema(ErrorResponseSchema, body);
  expect(body.error.code).toBe(code);
  return body.error;
}
