import { useState, type SubmitEvent, type KeyboardEvent } from 'react';
import { TITLE_MAX_LENGTH, type Task, type TaskChanges } from '../types';

interface TaskItemProps {
  task: Task;
  busy: boolean;
  onUpdate: (id: string, changes: TaskChanges) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskItem({ task, busy, onUpdate, onDelete }: TaskItemProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const isEditing = draft !== null;

  const startEditing = () => {
    if (!busy) setDraft(task.title);
  };
  const cancelEditing = () => {
    setDraft(null);
  };

  const handleSave = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft === null) return;
    const title = draft.trim();
    if (title === '') return;
    if (title === task.title || (await onUpdate(task.id, { title }))) setDraft(null);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') cancelEditing();
  };

  const handleDelete = () => {
    if (window.confirm(`Delete “${task.title}”?`)) void onDelete(task.id);
  };

  return (
    <li className={`task-item${task.completed ? ' completed' : ''}`} aria-busy={busy}>
      <input
        type="checkbox"
        checked={task.completed}
        disabled={busy || isEditing}
        onChange={(e) => void onUpdate(task.id, { completed: e.target.checked })}
        aria-label={`Mark “${task.title}” as ${task.completed ? 'not completed' : 'completed'}`}
      />

      {isEditing ? (
        <form className="task-edit" onSubmit={(e) => void handleSave(e)}>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            maxLength={TITLE_MAX_LENGTH}
            aria-label="Task title"
            disabled={busy}
            autoFocus
          />
          <button type="submit" className="button primary" disabled={busy || draft.trim() === ''}>
            Save
          </button>
          <button type="button" className="button" onClick={cancelEditing} disabled={busy}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <span className="task-title">{task.title}</span>
          <button type="button" className="button" onClick={startEditing} disabled={busy}>
            Edit
          </button>
          <button type="button" className="button danger" onClick={handleDelete} disabled={busy}>
            Delete
          </button>
        </>
      )}
    </li>
  );
}
