import { randomUUID } from 'node:crypto';
import { NotFoundError } from '../errors.js';
import type { TaskChanges, TaskRepository } from './task.repository.js';
import type { CreateTaskInput, Task, UpdateTaskInput } from './task.schema.js';

export interface TaskServiceDeps {
  repository: TaskRepository;
  now?: () => Date;
  generateId?: () => string;
}

/** Business rules for tasks. HTTP-agnostic: input shape is already validated by the route schema. */
export class TaskService {
  private readonly repository: TaskRepository;
  private readonly now: () => Date;
  private readonly generateId: () => string;

  constructor({ repository, now = () => new Date(), generateId = randomUUID }: TaskServiceDeps) {
    this.repository = repository;
    this.now = now;
    this.generateId = generateId;
  }

  list(): Promise<Task[]> {
    return this.repository.list();
  }

  async get(id: string): Promise<Task> {
    const task = await this.repository.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const timestamp = this.now().toISOString();
    const task: Task = {
      id: this.generateId(),
      title: input.title,
      completed: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.insert(task);
    return task;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    const changes: TaskChanges = { updatedAt: this.now().toISOString() };
    if (input.title !== undefined) changes.title = input.title;
    if (input.completed !== undefined) changes.completed = input.completed;

    const task = await this.repository.update(id, changes);
    if (!task) throw new NotFoundError('Task', id);
    return task;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);
    if (!deleted) throw new NotFoundError('Task', id);
  }
}
