// Mirrors the API contract (see /docs). Kept by hand for the POC; a generated client
// from the OpenAPI spec would remove the risk of drift.

export const TITLE_MAX_LENGTH = 200;

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskChanges {
  title?: string;
  completed?: boolean;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
