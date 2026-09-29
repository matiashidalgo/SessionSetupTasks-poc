import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from 'typebox';
import { ErrorResponseSchema } from '../errors.js';
import {
  CreateTaskBodySchema,
  TaskListSchema,
  TaskParamsSchema,
  TaskSchema,
  UpdateTaskBodySchema,
} from './task.schema.js';
import type { TaskService } from './task.service.js';

export interface TaskRoutesOptions {
  service: TaskService;
}

/** HTTP layer only: schemas, status codes and headers. All rules live in TaskService. */
export const taskRoutes: FastifyPluginAsyncTypebox<TaskRoutesOptions> = (app, { service }) => {
  const tags = ['Tasks'];

  // Trim before validation so the length limits apply to the title that gets stored.
  app.addHook('preValidation', (request, _reply, done) => {
    const body = request.body;
    if (typeof body === 'object' && body !== null && 'title' in body) {
      if (typeof body.title === 'string') body.title = body.title.trim();
    }
    done();
  });

  app.get(
    '',
    {
      schema: {
        tags,
        operationId: 'listTasks',
        summary: 'List all tasks (oldest first)',
        response: { 200: TaskListSchema },
      },
    },
    async () => ({ data: await service.list() }),
  );

  app.get(
    '/:id',
    {
      schema: {
        tags,
        operationId: 'getTask',
        summary: 'Get a task by id',
        params: TaskParamsSchema,
        response: { 200: TaskSchema, 400: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    (request) => service.get(request.params.id),
  );

  app.post(
    '',
    {
      schema: {
        tags,
        operationId: 'createTask',
        summary: 'Create a task',
        body: CreateTaskBodySchema,
        response: { 201: TaskSchema, 400: ErrorResponseSchema },
      },
    },
    async (request, reply) => {
      const task = await service.create(request.body);
      return reply.status(201).header('location', `${app.prefix}/${task.id}`).send(task);
    },
  );

  app.patch(
    '/:id',
    {
      schema: {
        tags,
        operationId: 'updateTask',
        summary: 'Update a task title and/or completion status',
        params: TaskParamsSchema,
        body: UpdateTaskBodySchema,
        response: { 200: TaskSchema, 400: ErrorResponseSchema, 404: ErrorResponseSchema },
      },
    },
    (request) => service.update(request.params.id, request.body),
  );

  app.delete(
    '/:id',
    {
      schema: {
        tags,
        operationId: 'deleteTask',
        summary: 'Delete a task',
        params: TaskParamsSchema,
        response: {
          204: Type.Null({ description: 'Task deleted' }),
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await service.delete(request.params.id);
      return reply.status(204).send(null);
    },
  );

  return Promise.resolve();
};
