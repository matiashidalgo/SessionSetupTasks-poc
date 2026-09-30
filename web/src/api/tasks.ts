import type { ApiErrorBody, Task, TaskChanges } from '../types';

const TASKS_URL = '/api/v1/tasks';
const UNREACHABLE_MESSAGE = 'Cannot reach the server. Is the API running?';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorBody).error.message === 'string'
  );
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body: unknown = await res.json();
    if (isApiErrorBody(body)) {
      const detail = body.error.details?.[0];
      const message = detail ? `${detail.field} ${detail.message}` : body.error.message;
      return new ApiError(res.status, body.error.code, message);
    }
  } catch {
    // Not a JSON error body (e.g. a proxy error page); fall through to a generic message.
  }
  return new ApiError(res.status, 'HTTP_ERROR', `Request failed with status ${res.status}`);
}

async function request<T>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      // Only send a JSON content type when there is a body: the API rejects empty JSON bodies.
      ...(json !== undefined && {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(json),
      }),
    });
  } catch (err) {
    if (rest.signal?.aborted) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', UNREACHABLE_MESSAGE);
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const tasksApi = {
  async list(signal?: AbortSignal): Promise<Task[]> {
    const body = await request<{ data: Task[] }>(TASKS_URL, signal ? { signal } : {});
    return body.data;
  },

  create(title: string): Promise<Task> {
    return request<Task>(TASKS_URL, { method: 'POST', json: { title } });
  },

  update(id: string, changes: TaskChanges): Promise<Task> {
    return request<Task>(`${TASKS_URL}/${id}`, { method: 'PATCH', json: changes });
  },

  remove(id: string): Promise<void> {
    return request<undefined>(`${TASKS_URL}/${id}`, { method: 'DELETE' });
  },
};
