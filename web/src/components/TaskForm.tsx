import { useRef, useState, type SubmitEvent } from 'react';
import { TITLE_MAX_LENGTH } from '../types';

interface TaskFormProps {
  onCreate: (title: string) => Promise<boolean>;
  isCreating: boolean;
  disabled: boolean;
}

export function TaskForm({ onCreate, isCreating, disabled }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isBlank = title.trim() === '';

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBlank || disabled) return;
    if (await onCreate(title)) setTitle('');
    inputRef.current?.focus();
  };

  return (
    <form className="task-form" onSubmit={(e) => void handleSubmit(e)}>
      <label htmlFor="new-task-title" className="visually-hidden">
        New task
      </label>
      <input
        id="new-task-title"
        ref={inputRef}
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
        }}
        placeholder="Add a setup task, e.g. “Test host microphone”"
        maxLength={TITLE_MAX_LENGTH}
        autoComplete="off"
        autoFocus
      />
      <button type="submit" className="button primary" disabled={isBlank || disabled}>
        {isCreating ? 'Adding…' : 'Add task'}
      </button>
    </form>
  );
}
