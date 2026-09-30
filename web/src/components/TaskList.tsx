import type { Task, TaskChanges } from '../types';
import { TaskItem } from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  isPending: (id: string) => boolean;
  onUpdate: (id: string, changes: TaskChanges) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskList({ tasks, isPending, onUpdate, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="empty">No tasks yet. Add the first setup task above.</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          busy={isPending(task.id)}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
