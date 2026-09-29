import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteTaskRepository } from '../src/tasks/sqlite.repository.js';
import type { Task } from '../src/tasks/task.schema.js';
describe('SqliteTaskRepository', () => {
  const task: Task = {
    id: '33333333-3333-4333-8333-333333333333',
    title: 'Survives a restart',
    completed: true,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
  };
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tasks-db-'));
    dbPath = join(dir, 'nested', 'tasks.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates missing directories and persists data across reopen', async () => {
    const first = new SqliteTaskRepository(dbPath);
    await first.insert(task);
    first.close();

    const second = new SqliteTaskRepository(dbPath);
    expect(await second.list()).toEqual([task]);
    second.close();
  });
});
