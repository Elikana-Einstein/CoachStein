import { useState, type FormEvent } from 'react';
import { EMPTY_TASK_DRAFT, type Priority, type RoadmapTask, type TaskDraft } from './types';

interface TaskDialogProps {
  task?: RoadmapTask;
  tasks: RoadmapTask[];
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
}

export default function TaskDialog({ task, tasks, onClose, onSave }: TaskDialogProps) {
  const [draft, setDraft] = useState<TaskDraft>(() => task ? {
    title: task.title, description: task.description, notes: task.notes ?? '', dueDate: task.dueDate, priority: task.priority,
    estimateMinutes: task.estimateMinutes ? String(task.estimateMinutes) : '', milestone: task.milestone,
    blocked: task.blocked, resourceUrl: task.resourceUrl, completionCriteria: task.completionCriteria,
    dependencyId: task.dependencyIds[0] ?? '',
  } : EMPTY_TASK_DRAFT);
  const [error, setError] = useState('');
  const update = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim()) return setError('Add a clear action for this task.');
    if (draft.resourceUrl && !/^https?:\/\//i.test(draft.resourceUrl)) return setError('Resource links must start with http:// or https://.');
    if (draft.dependencyId === task?.id) return setError('A task cannot depend on itself.');
    onSave({ ...draft, title: draft.title.trim() });
  };
  const availableDependencies = tasks.filter((item) => item.id !== task?.id);

  return <div className="planner-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="planner-dialog" role="dialog" aria-modal="true" aria-labelledby="task-dialog-title">
      <div className="planner-dialog-head"><div><span className="planner-eyebrow">ACTION ITEM</span><h2 id="task-dialog-title">{task ? 'Edit task' : 'Add a task'}</h2></div><button className="planner-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
      <form onSubmit={submit}>
        <label className="planner-field full">Task title<input autoFocus maxLength={100} value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="What is the next concrete action?" /></label>
        <label className="planner-field full">Description<textarea rows={2} maxLength={500} value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Add useful context" /></label>
        <label className="planner-field full">Notes<textarea rows={2} maxLength={1000} value={draft.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Capture decisions, observations, or useful details" /></label>
        <div className="planner-form-grid">
          <label className="planner-field">Due date<input type="date" value={draft.dueDate} onChange={(event) => update('dueDate', event.target.value)} /></label>
          <label className="planner-field">Priority<select value={draft.priority} onChange={(event) => update('priority', event.target.value as Priority)}>{(['low', 'medium', 'high', 'urgent'] as Priority[]).map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label className="planner-field">Estimate (minutes)<input type="number" min="0" step="5" value={draft.estimateMinutes} onChange={(event) => update('estimateMinutes', event.target.value)} placeholder="45" /></label>
          <label className="planner-field">Depends on<select value={draft.dependencyId} onChange={(event) => update('dependencyId', event.target.value)}><option value="">No dependency</option>{availableDependencies.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="planner-field full">Resource link<input type="url" value={draft.resourceUrl} onChange={(event) => update('resourceUrl', event.target.value)} placeholder="https://…" /></label>
          <label className="planner-field full">Completion criteria<input value={draft.completionCriteria} onChange={(event) => update('completionCriteria', event.target.value)} placeholder="How will you know this is done?" /></label>
        </div>
        <div className="planner-toggle-row"><label><input type="checkbox" checked={draft.milestone} onChange={(event) => update('milestone', event.target.checked)} /> Important milestone</label><label><input type="checkbox" checked={draft.blocked} onChange={(event) => update('blocked', event.target.checked)} /> Currently blocked</label></div>
        {error && <p className="planner-form-error" role="alert">{error}</p>}
        <div className="planner-dialog-actions"><button type="button" className="planner-secondary-btn" onClick={onClose}>Cancel</button><button className="planner-primary-btn" type="submit">{task ? 'Save task' : 'Add task'}</button></div>
      </form>
    </section>
  </div>;
}
