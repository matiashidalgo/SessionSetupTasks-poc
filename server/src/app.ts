import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandling } from './errors.js';
import type { TaskRepository } from './tasks/task.repository.js';
import { taskRoutes } from './tasks/task.routes.js';
import { TaskService } from './tasks/task.service.js';

export const API_PREFIX = '/api/v1';

export interface AppOptions {
  repository: TaskRepository;
  logger?: FastifyServerOptions['logger'];
}

export async function buildApp({
  repository,
  logger = false,
}: AppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    routerOptions: { ignoreTrailingSlash: true },
    ajv: {
      customOptions: {
        // Fastify defaults silently drop unknown fields and coerce types ("true" -> true).
        // An API consumed by other tools should reject malformed input instead.
        removeAdditional: false,
        coerceTypes: false,
      },
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  registerErrorHandling(app);

  // Awaited so its onRoute hook is active before any route is declared.
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Session Setup Tasks API',
        description: 'Manage setup tasks for a live commerce session.',
        version: '1.0.0',
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(taskRoutes, {
    prefix: `${API_PREFIX}/tasks`,
    service: new TaskService({ repository }),
  });

  return app;
}
