import type { TaskChanges, TaskRepository } from './task.repository.js';
import type { Task } from './task.schema.js';

/** Non-persistent repository for tests and throwaway runs. Returns copies to avoid aliasing. */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  list(): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values(), (task) => ({ ...task }));
    // ISO-8601 UTC strings sort chronologically; the stable sort keeps insertion order on ties.
    tasks.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
    return Promise.resolve(tasks);
  }

  findById(id: string): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    return Promise.resolve(task && { ...task });
  }

  insert(task: Task): Promise<void> {
    this.tasks.set(task.id, { ...task });
    return Promise.resolve();
  }

  update(id: string, changes: TaskChanges): Promise<Task | undefined> {
    const existing = this.tasks.get(id);
    if (!existing) return Promise.resolve(undefined);
    const updated = { ...existing, ...changes };
    this.tasks.set(id, updated);
    return Promise.resolve({ ...updated });
  }

  delete(id: string): Promise<boolean> {
    return Promise.resolve(this.tasks.delete(id));
  }
}
