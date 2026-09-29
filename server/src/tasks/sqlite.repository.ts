import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import type { TaskChanges, TaskRepository } from './task.repository.js';
import type { Task } from './task.schema.js';

interface TaskRow {
  id: string;
  title: string;
  completed: 0 | 1;
  created_at: string;
  updated_at: string;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS tasks (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    completed  INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at);
`;

const COLUMNS = 'id, title, completed, created_at, updated_at';

/**
 * SQLite-backed repository using Node's built-in driver (no native build step).
 * The driver is synchronous; results are wrapped in promises to honour the async port.
 */
export class SqliteTaskRepository implements TaskRepository {
  private readonly db: DatabaseSync;
  private open = true;
  private readonly statements: Record<
    'list' | 'findById' | 'insert' | 'update' | 'delete',
    StatementSync
  >;

  /** @param path File path, or `:memory:` for a throwaway database. */
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec(SCHEMA);

    this.statements = {
      // rowid breaks ties between tasks created in the same millisecond (insertion order).
      list: this.db.prepare(`SELECT ${COLUMNS} FROM tasks ORDER BY created_at, rowid`),
      findById: this.db.prepare(`SELECT ${COLUMNS} FROM tasks WHERE id = :id`),
      insert: this.db.prepare(
        `INSERT INTO tasks (${COLUMNS}) VALUES (:id, :title, :completed, :createdAt, :updatedAt)`,
      ),
      // NULL means "leave unchanged", so one prepared statement covers every partial update.
      update: this.db.prepare(
        `UPDATE tasks
            SET title      = COALESCE(:title, title),
                completed  = COALESCE(:completed, completed),
                updated_at = :updatedAt
          WHERE id = :id
      RETURNING ${COLUMNS}`,
      ),
      delete: this.db.prepare('DELETE FROM tasks WHERE id = :id'),
    };
  }

  list(): Promise<Task[]> {
    return attempt(() =>
      this.statements.list.all().map((row) => toTask(row as unknown as TaskRow)),
    );
  }

  findById(id: string): Promise<Task | undefined> {
    return attempt(() => {
      const row = this.statements.findById.get({ id }) as TaskRow | undefined;
      return row && toTask(row);
    });
  }

  insert(task: Task): Promise<void> {
    return attempt(() => {
      this.statements.insert.run({ ...task, completed: task.completed ? 1 : 0 });
    });
  }

  update(id: string, changes: TaskChanges): Promise<Task | undefined> {
    return attempt(() => {
      const row = this.statements.update.get({
        id,
        title: changes.title ?? null,
        completed: changes.completed === undefined ? null : changes.completed ? 1 : 0,
        updatedAt: changes.updatedAt,
      }) as TaskRow | undefined;
      return row && toTask(row);
    });
  }

  delete(id: string): Promise<boolean> {
    return attempt(() => this.statements.delete.run({ id }).changes > 0);
  }

  close(): void {
    // Tracked here because DatabaseSync.isOpen only exists from Node 22.15.
    if (!this.open) return;
    this.open = false;
    this.db.close();
  }
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Runs a synchronous driver call, turning thrown errors into rejections. */
function attempt<T>(fn: () => T): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
}
