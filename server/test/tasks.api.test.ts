import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TITLE_MAX_LENGTH,
  TaskListSchema,
  TaskSchema,
  type Task,
} from '../src/tasks/task.schema.js';
import {
  TASKS_URL,
  UNKNOWN_ID,
  createTask,
  createTestApp,
  expectError,
  expectSchema,
} from './helpers.js';

const T0 = new Date('2026-01-01T10:00:00.000Z');
const T1 = new Date('2026-01-01T10:05:00.000Z');

let app: FastifyInstance;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  app = await createTestApp();
});

afterEach(async () => {
  await app.close();
  vi.useRealTimers();
});

describe('POST /api/v1/tasks', () => {
  it('creates a pending task and returns 201 with a Location header', async () => {
    const res = await app.inject({
      method: 'POST',
      url: TASKS_URL,
      payload: { title: 'Test host microphone' },
    });

    expect(res.statusCode).toBe(201);
    const task = res.json<Task>();
    expectSchema(TaskSchema, task);
    expect(task).toMatchObject({
      title: 'Test host microphone',
      completed: false,
      createdAt: T0.toISOString(),
      updatedAt: T0.toISOString(),
    });
    expect(res.headers.location).toBe(`${TASKS_URL}/${task.id}`);
  });

  it('trims the title', async () => {
    const task = await createTask(app, '   Check lighting  ');
    expect(task.title).toBe('Check lighting');
  });

  it(`accepts a title of exactly ${TITLE_MAX_LENGTH} characters`, async () => {
    const task = await createTask(app, 'x'.repeat(TITLE_MAX_LENGTH));
    expect(task.title).toHaveLength(TITLE_MAX_LENGTH);
  });

  it('applies the length limit after trimming', async () => {
    const task = await createTask(app, `  ${'x'.repeat(TITLE_MAX_LENGTH)}  `);
    expect(task.title).toBe('x'.repeat(TITLE_MAX_LENGTH));
  });

  it('persists the task so it can be read back', async () => {
    const created = await createTask(app, 'Upload product catalog');
    const res = await app.inject({ url: `${TASKS_URL}/${created.id}` });
    expect(res.json()).toEqual(created);
  });

  it.each([
    ['title is missing', {}, 'body.title'],
    ['title is empty', { title: '' }, 'body.title'],
    ['title is only whitespace', { title: '   ' }, 'body.title'],
    ['title is too long', { title: 'x'.repeat(TITLE_MAX_LENGTH + 1) }, 'body.title'],
    ['title is not a string', { title: 42 }, 'body.title'],
    ['an unknown field is sent', { title: 'ok', priority: 'high' }, 'body.priority'],
    ['the body is not an object', ['Check lighting'], 'body'],
  ])('returns 400 when %s', async (_case, payload, field) => {
    const error = await expectError(
      app,
      { method: 'POST', url: TASKS_URL, payload },
      400,
      'VALIDATION_ERROR',
    );
    expect(error.details?.map((d) => d.field)).toEqual([field]);
  });

  it('returns 400 for malformed JSON', async () => {
    await expectError(
      app,
      {
        method: 'POST',
        url: TASKS_URL,
        headers: { 'content-type': 'application/json' },
        payload: '{"title":',
      },
      400,
      'REQUEST_ERROR',
    );
  });

  it('does not create anything when validation fails', async () => {
    await app.inject({ method: 'POST', url: TASKS_URL, payload: { title: '' } });
    const res = await app.inject({ url: TASKS_URL });
    expect(res.json()).toEqual({ data: [] });
  });
});

describe('GET /api/v1/tasks', () => {
  it('returns an empty list wrapped in data', async () => {
    const res = await app.inject({ url: TASKS_URL });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: [] });
  });

  it('returns all tasks, oldest first', async () => {
    const first = await createTask(app, 'First');
    vi.setSystemTime(T1);
    const second = await createTask(app, 'Second');

    const res = await app.inject({ url: TASKS_URL });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: Task[] }>();
    expectSchema(TaskListSchema, body);
    expect(body.data).toEqual([first, second]);
  });

  it('tolerates a trailing slash', async () => {
    const res = await app.inject({ url: `${TASKS_URL}/` });
    expect(res.statusCode).toBe(200);
  });
});

describe('GET /api/v1/tasks/:id', () => {
  it('returns the task', async () => {
    const created = await createTask(app, 'Test stream key');
    const res = await app.inject({ url: `${TASKS_URL}/${created.id}` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(created);
  });

  it('returns 404 for an unknown id', async () => {
    const error = await expectError(app, { url: `${TASKS_URL}/${UNKNOWN_ID}` }, 404, 'NOT_FOUND');
    expect(error.message).toContain(UNKNOWN_ID);
  });

  it('returns 400 for a malformed id', async () => {
    const error = await expectError(
      app,
      { url: `${TASKS_URL}/not-a-uuid` },
      400,
      'VALIDATION_ERROR',
    );
    expect(error.details?.map((d) => d.field)).toEqual(['params.id']);
  });
});

describe('PATCH /api/v1/tasks/:id', () => {
  let task: Task;

  beforeEach(async () => {
    task = await createTask(app, 'Test host mic');
    vi.setSystemTime(T1);
  });

  const patch = (payload: unknown, id = task.id) =>
    app.inject({ method: 'PATCH', url: `${TASKS_URL}/${id}`, payload: payload as object });

  it('updates the title (trimmed) and bumps updatedAt only', async () => {
    const res = await patch({ title: '  Test host microphone ' });

    expect(res.statusCode).toBe(200);
    const updated = res.json<Task>();
    expectSchema(TaskSchema, updated);
    expect(updated).toEqual({
      ...task,
      title: 'Test host microphone',
      updatedAt: T1.toISOString(),
    });
  });

  it('marks the task as completed and can reopen it', async () => {
    const completed = await patch({ completed: true });
    expect(completed.json<Task>().completed).toBe(true);

    const reopened = await patch({ completed: false });
    expect(reopened.json<Task>().completed).toBe(false);
  });

  it('updates title and completed together', async () => {
    const res = await patch({ title: 'Mic checked', completed: true });
    expect(res.json()).toMatchObject({ title: 'Mic checked', completed: true });
  });

  it('persists the change', async () => {
    await patch({ completed: true });
    const res = await app.inject({ url: `${TASKS_URL}/${task.id}` });
    expect(res.json<Task>().completed).toBe(true);
  });

  it.each([
    ['the body is empty', {}, 'body'],
    ['title is only whitespace', { title: '  ' }, 'body.title'],
    ['title is too long', { title: 'x'.repeat(TITLE_MAX_LENGTH + 1) }, 'body.title'],
    ['completed is not a boolean', { completed: 'true' }, 'body.completed'],
    ['an unknown field is sent', { done: true }, 'body.done'],
  ])('returns 400 when %s', async (_case, payload, field) => {
    const error = await expectError(
      app,
      { method: 'PATCH', url: `${TASKS_URL}/${task.id}`, payload },
      400,
      'VALIDATION_ERROR',
    );
    expect(error.details?.map((d) => d.field)).toEqual([field]);
  });

  it('leaves the task unchanged when validation fails', async () => {
    await patch({ title: '   ' });
    const res = await app.inject({ url: `${TASKS_URL}/${task.id}` });
    expect(res.json()).toEqual(task);
  });

  it('returns 404 for an unknown id', async () => {
    await expectError(
      app,
      { method: 'PATCH', url: `${TASKS_URL}/${UNKNOWN_ID}`, payload: { completed: true } },
      404,
      'NOT_FOUND',
    );
  });

  it('returns 400 for a malformed id', async () => {
    await expectError(
      app,
      { method: 'PATCH', url: `${TASKS_URL}/123`, payload: { completed: true } },
      400,
      'VALIDATION_ERROR',
    );
  });
});

describe('DELETE /api/v1/tasks/:id', () => {
  it('deletes the task and returns 204 with no body', async () => {
    const task = await createTask(app, 'Remove me');

    const res = await app.inject({ method: 'DELETE', url: `${TASKS_URL}/${task.id}` });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe('');
    await expectError(app, { url: `${TASKS_URL}/${task.id}` }, 404, 'NOT_FOUND');
  });

  it('only deletes the targeted task', async () => {
    const keep = await createTask(app, 'Keep me');
    const remove = await createTask(app, 'Remove me');

    await app.inject({ method: 'DELETE', url: `${TASKS_URL}/${remove.id}` });

    const res = await app.inject({ url: TASKS_URL });
    expect(res.json()).toEqual({ data: [keep] });
  });

  it('returns 404 for an unknown or already deleted id', async () => {
    const task = await createTask(app, 'Remove me twice');
    await app.inject({ method: 'DELETE', url: `${TASKS_URL}/${task.id}` });

    await expectError(app, { method: 'DELETE', url: `${TASKS_URL}/${task.id}` }, 404, 'NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    await expectError(app, { method: 'DELETE', url: `${TASKS_URL}/abc` }, 400, 'VALIDATION_ERROR');
  });
});
