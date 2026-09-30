import { TaskForm } from './components/TaskForm';
import { TaskList } from './components/TaskList';
import { useTasks } from './hooks/useTasks';

export function App() {
  const {
    tasks,
    load,
    error,
    dismissError,
    reload,
    isCreating,
    isPending,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks();

  return (
    <main className="app">
      <header className="app-header">
        <h1>Session setup tasks</h1>
      </header>

      <TaskForm
        onCreate={createTask}
        isCreating={isCreating}
        disabled={isCreating || load.status !== 'ready'}
      />

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button type="button" className="button" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {load.status === 'loading' && <p className="empty">Loading tasks…</p>}
      {load.status === 'error' && (
        <div className="banner error" role="alert">
          <span>Could not load tasks: {load.message}</span>
          <button type="button" className="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {load.status === 'ready' && (
        <TaskList tasks={tasks} isPending={isPending} onUpdate={updateTask} onDelete={deleteTask} />
      )}
    </main>
  );
}
