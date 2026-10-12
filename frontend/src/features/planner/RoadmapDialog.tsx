import { useState, type FormEvent } from 'react';
import { EMPTY_ROADMAP_DRAFT, type RoadmapDraft, type Roadmap, type Priority, type RoadmapStatus } from './types';

interface RoadmapDialogProps {
  roadmap?: Roadmap;
  onClose: () => void;
  onSave: (draft: RoadmapDraft) => void;
}

const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
const statuses: RoadmapStatus[] = ['not-started', 'in-progress', 'on-hold', 'completed'];

export default function RoadmapDialog({ roadmap, onClose, onSave }: RoadmapDialogProps) {
  const [draft, setDraft] = useState<RoadmapDraft>(() => roadmap ? {
    title: roadmap.title, description: roadmap.description, category: roadmap.category, icon: roadmap.icon,
    color: roadmap.color, startDate: roadmap.startDate, targetDate: roadmap.targetDate,
    priority: roadmap.priority, status: roadmap.status, tags: roadmap.tags.join(', '),
  } : EMPTY_ROADMAP_DRAFT);
  const [error, setError] = useState('');
  const update = <K extends keyof RoadmapDraft>(key: K, value: RoadmapDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim()) return setError('Add a name for this roadmap.');
    if (draft.targetDate && draft.startDate && draft.targetDate < draft.startDate) return setError('The target date must be after the start date.');
    onSave({ ...draft, title: draft.title.trim(), tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean).join(', ') });
  };

  return <div className="planner-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="planner-dialog" role="dialog" aria-modal="true" aria-labelledby="roadmap-dialog-title">
      <div className="planner-dialog-head"><div><span className="planner-eyebrow">ROADMAP SETUP</span><h2 id="roadmap-dialog-title">{roadmap ? 'Edit roadmap' : 'Create a roadmap'}</h2></div><button className="planner-icon-btn" onClick={onClose} aria-label="Close">×</button></div>
      <form onSubmit={submit}>
        <label className="planner-field full">Roadmap title<input autoFocus maxLength={80} value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Learn embedded systems" /></label>
        <label className="planner-field full">Description<textarea rows={3} maxLength={320} value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="What will you be able to do when you finish?" /></label>
        <div className="planner-form-grid">
          <label className="planner-field">Category<input value={draft.category} onChange={(event) => update('category', event.target.value)} placeholder="Learning" /></label>
          <label className="planner-field">Tags<input value={draft.tags} onChange={(event) => update('tags', event.target.value)} placeholder="CAD, controls" /></label>
          <label className="planner-field">Start date<input type="date" value={draft.startDate} onChange={(event) => update('startDate', event.target.value)} /></label>
          <label className="planner-field">Target date<input type="date" value={draft.targetDate} onChange={(event) => update('targetDate', event.target.value)} /></label>
          <label className="planner-field">Priority<select value={draft.priority} onChange={(event) => update('priority', event.target.value as Priority)}>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label className="planner-field">Status<select value={draft.status} onChange={(event) => update('status', event.target.value as RoadmapStatus)}>{statuses.map((status) => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}</select></label>
          <label className="planner-field">Accent<select value={draft.color} onChange={(event) => update('color', event.target.value as RoadmapDraft['color'])}><option value="mint">Mint</option><option value="amber">Amber</option><option value="violet">Violet</option><option value="blue">Blue</option></select></label>
          <label className="planner-field">Icon<input maxLength={3} value={draft.icon} onChange={(event) => update('icon', event.target.value)} /></label>
        </div>
        {error && <p className="planner-form-error" role="alert">{error}</p>}
        <div className="planner-dialog-actions"><button type="button" className="planner-secondary-btn" onClick={onClose}>Cancel</button><button className="planner-primary-btn" type="submit">{roadmap ? 'Save changes' : 'Create roadmap'}</button></div>
      </form>
    </section>
  </div>;
}
