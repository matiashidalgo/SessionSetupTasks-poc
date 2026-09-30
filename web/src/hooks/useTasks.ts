import { useCallback, useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks';
import type { Task, TaskChanges } from '../types';

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

const CREATE_KEY = 'create';

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

/**
 * Owns the task list. Every mutation waits for the server and then applies the server's
 * response, so the UI never shows state the API did not confirm (no optimistic updates).
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    tasksApi.list(controller.signal).then(
      (data) => {
        setTasks(data);
        setLoad({ status: 'ready' });
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setLoad({ status: 'error', message: messageOf(err) });
      },
    );
    return () => {
      controller.abort();
    };
  }, [reloadCount]);

  const reload = useCallback(() => {
    setLoad({ status: 'loading' });
    setError(null);
    setReloadCount((n) => n + 1);
  }, []);

  /** Runs a request for `key`, tracking it as pending and surfacing failures in `error`. */
  const track = useCallback(
    async <T>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
      setPending((prev) => new Set(prev).add(key));
      setError(null);
      try {
        return await action();
      } catch (err) {
        setError(messageOf(err));
        return undefined;
      } finally {
        setPending((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [],
  );

  const createTask = useCallback(
    async (title: string): Promise<boolean> => {
      const task = await track(CREATE_KEY, () => tasksApi.create(title));
      if (task) setTasks((prev) => [...prev, task]);
      return task !== undefined;
    },
    [track],
  );

  const updateTask = useCallback(
    async (id: string, changes: TaskChanges): Promise<boolean> => {
      const task = await track(id, () => tasksApi.update(id, changes));
      if (task) setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
      return task !== undefined;
    },
    [track],
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const done = await track(id, async () => {
        await tasksApi.remove(id);
        return true;
      });
      if (done) setTasks((prev) => prev.filter((t) => t.id !== id));
    },
    [track],
  );

  return {
    tasks,
    load,
    error,
    dismissError: useCallback(() => {
      setError(null);
    }, []),
    reload,
    isCreating: pending.has(CREATE_KEY),
    isPending: (id: string) => pending.has(id),
    createTask,
    updateTask,
    deleteTask,
  };
}
