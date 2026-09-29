import type { Task } from './task.schema.js';

export type TaskChanges = Partial<Pick<Task, 'title' | 'completed'>> & Pick<Task, 'updatedAt'>;

/**
 * Persistence port. Async on purpose: the SQLite driver is synchronous, but a future
 * networked store (e.g. Postgres) will not be, and callers should not have to change.
 */
export interface TaskRepository {
  /** All tasks, oldest first. */
  list(): Promise<Task[]>;
  findById(id: string): Promise<Task | undefined>;
  insert(task: Task): Promise<void>;
  /** Applies the changes and returns the updated task, or undefined if it does not exist. */
  update(id: string, changes: TaskChanges): Promise<Task | undefined>;
  /** Returns false if the task did not exist. */
  delete(id: string): Promise<boolean>;
}
