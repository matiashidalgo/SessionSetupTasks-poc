import { Type, type Static } from 'typebox';

export const TITLE_MAX_LENGTH = 200;

const Title = Type.String({
  minLength: 1,
  maxLength: TITLE_MAX_LENGTH,
  description: 'Trimmed before validation, so it must have 1-200 non-blank characters.',
  examples: ['Test host microphone'],
});

export const TaskSchema = Type.Object(
  {
    id: Type.String({ format: 'uuid' }),
    title: Type.String(),
    completed: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  },
  { additionalProperties: false },
);
export type Task = Static<typeof TaskSchema>;

export const TaskListSchema = Type.Object({ data: Type.Array(TaskSchema) });

export const TaskParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });

export const CreateTaskBodySchema = Type.Object({ title: Title }, { additionalProperties: false });
export type CreateTaskInput = Static<typeof CreateTaskBodySchema>;

export const UpdateTaskBodySchema = Type.Object(
  {
    title: Type.Optional(Title),
    completed: Type.Optional(Type.Boolean()),
  },
  {
    additionalProperties: false,
    minProperties: 1,
    description: 'Partial update. Provide at least one field.',
  },
);
export type UpdateTaskInput = Static<typeof UpdateTaskBodySchema>;
