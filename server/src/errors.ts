import type { FastifyError, FastifyInstance } from 'fastify';
import { Type, type Static } from 'typebox';

export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String({
      examples: ['VALIDATION_ERROR', 'NOT_FOUND', 'REQUEST_ERROR', 'INTERNAL_ERROR'],
    }),
    message: Type.String(),
    details: Type.Optional(
      Type.Array(Type.Object({ field: Type.String(), message: Type.String() })),
    ),
  }),
});
export type ErrorResponse = Static<typeof ErrorResponseSchema>;
export type ErrorDetail = NonNullable<ErrorResponse['error']['details']>[number];

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} ${id} not found`);
  }
}

function body(code: string, message: string, details?: ErrorDetail[]): ErrorResponse {
  return { error: { code, message, ...(details && { details }) } };
}

function validationDetails(error: FastifyError): ErrorDetail[] {
  return (error.validation ?? []).map((issue) => {
    const params: Record<string, unknown> = issue.params;
    const property = params.missingProperty ?? params.additionalProperty;
    const path = issue.instancePath.replace(/^\//, '').replaceAll('/', '.');
    const field = [error.validationContext, path, property].filter(Boolean).join('.');
    return { field, message: issue.message ?? 'is invalid' };
  });
}

/** Maps every error (validation, domain, framework, unexpected) to the same error body. */
export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError | AppError>((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(body(error.code, error.message, error.details));
    }

    if (error.validation) {
      return reply
        .status(400)
        .send(body('VALIDATION_ERROR', 'Request validation failed', validationDetails(error)));
    }

    const status = error.statusCode ?? 500;
    if (status < 500) {
      return reply.status(status).send(body('REQUEST_ERROR', error.message));
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send(body('INTERNAL_ERROR', 'An unexpected error occurred'));
  });
}
