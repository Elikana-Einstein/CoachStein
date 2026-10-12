import { useEffect, useRef, useState } from 'react';
import RoadmapDialog from './RoadmapDialog';
import TaskDialog from './TaskDialog';
import { deriveRoadmapStatus, flattenTasks, movePhase, moveTask, moveTrack, phaseProgress, roadmapProgress, setTaskStatus, trackProgress } from './progress';
import { loadRoadmaps, newId, saveRoadmaps } from './storage';
import type { PlannerView, Priority, Roadmap, RoadmapDraft, RoadmapPhase, RoadmapTask, RoadmapTrack, TaskDraft, TaskStatus } from './types';

type SortBy = 'deadline' | 'progress' | 'priority' | 'updated';
type EntryDialog = { kind: 'track' | 'phase'; trackId?: string; phaseId?: string; title: string; color?: RoadmapTrack['color'] } | null;
const priorityWeight: Record<Priority, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
const taskStatuses: TaskStatus[] = ['todo', 'in-progress', 'blocked', 'completed'];
const toDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No target date';
const shortDate = (value: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No date';
const startOfToday = () => new Date(new Date().toISOString().slice(0, 10));
const isOverdue = (date: string) => Boolean(date && new Date(`${date}T00:00:00`) < startOfToday());
const isDueSoon = (date: string) => Boolean(date && new Date(`${date}T00:00:00`) >= startOfToday() && new Date(`${date}T00:00:00`).getTime() <= startOfToday().getTime() + 7 * 86_400_000);
const emptyRoadmap = (draft: RoadmapDraft): Roadmap => {
  const now = new Date().toISOString();
  return { ...draft, id: newId(), tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean), tracks: [], createdAt: now, updatedAt: now, archived: false, sample: false };
};
const cloneRoadmap = (source: Roadmap): Roadmap => {
  const now = new Date().toISOString();
  return { ...source, id: newId(), title: `${source.title} (copy)`, createdAt: now, updatedAt: now, archived: false, sample: false,
    tracks: source.tracks.map((track) => ({ ...track, id: newId(), phases: track.phases.map((phase) => ({ ...phase, id: newId(), tasks: phase.tasks.map((task) => ({ ...task, id: newId(), dependencyIds: [] })) })) })) };
};
const taskDraft = (draft: TaskDraft, previous?: RoadmapTask): RoadmapTask => ({
  id: previous?.id ?? newId(), title: draft.title, description: draft.description, notes: draft.notes,
  status: draft.blocked ? 'blocked' : previous?.status === 'blocked' ? 'todo' : previous?.status ?? 'todo',
  priority: draft.priority, dueDate: draft.dueDate, estimateMinutes: Number(draft.estimateMinutes) || 0,
  milestone: draft.milestone, blocked: draft.blocked, dependencyIds: draft.dependencyId ? [draft.dependencyId] : [],
  resourceUrl: draft.resourceUrl, completionCriteria: draft.completionCriteria, order: previous?.order ?? 0, updatedAt: new Date().toISOString(),
});

export default function Planner() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>(loadRoadmaps);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState<PlannerView>('outline');
  const [roadmapDialog, setRoadmapDialog] = useState<Roadmap | 'new' | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ trackId: string; phaseId: string; task?: RoadmapTask } | null>(null);
  const [entryDialog, setEntryDialog] = useState<EntryDialog>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const selected = roadmaps.find((roadmap) => roadmap.id === selectedId) ?? null;
  const visibleRoadmaps = roadmaps.filter((roadmap) => showArchived ? roadmap.archived : !roadmap.archived);
  const categories = [...new Set(visibleRoadmaps.map((roadmap) => roadmap.category).filter(Boolean))].sort();

  useEffect(() => {
    const onStorageError = () => setStorageError(true);
    const onStorageSuccess = () => setStorageError(false);
    window.addEventListener('planner-storage-error', onStorageError);
    window.addEventListener('planner-storage-success', onStorageSuccess);
    return () => {
      window.removeEventListener('planner-storage-error', onStorageError);
      window.removeEventListener('planner-storage-success', onStorageSuccess);
    };
  }, []);

  useEffect(() => {
    try { saveRoadmaps(roadmaps); window.dispatchEvent(new Event('planner-storage-success')); }
    catch { window.dispatchEvent(new Event('planner-storage-error')); }
  }, [roadmaps]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const allTasks = visibleRoadmaps.flatMap((roadmap) => flattenTasks(roadmap).map((task) => ({ ...task, roadmapId: roadmap.id, roadmapTitle: roadmap.title })));
  const dueTasks = allTasks.filter((task) => task.status !== 'completed' && (isOverdue(task.dueDate) || isDueSoon(task.dueDate)));
  const roadmapStats = {
    total: visibleRoadmaps.length,
    inProgress: visibleRoadmaps.filter((roadmap) => roadmap.status === 'in-progress').length,
    completedTasks: allTasks.filter((task) => task.status === 'completed').length,
    dueTasks: dueTasks.length,
  };

  const filtered = visibleRoadmaps.filter((roadmap) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [roadmap.title, roadmap.description, roadmap.category, ...roadmap.tags].some((value) => value.toLowerCase().includes(query));
    return matchesSearch && (statusFilter === 'all' || roadmap.status === statusFilter) && (categoryFilter === 'all' || roadmap.category === categoryFilter);
  }).sort((a, b) => {
    if (sortBy === 'deadline') return (a.targetDate || '9999').localeCompare(b.targetDate || '9999');
    if (sortBy === 'progress') return roadmapProgress(b).percent - roadmapProgress(a).percent;
    if (sortBy === 'priority') return priorityWeight[b.priority] - priorityWeight[a.priority];
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  const updateRoadmap = (id: string, transform: (roadmap: Roadmap) => Roadmap) => setRoadmaps((current) => current.map((roadmap) => roadmap.id === id ? transform(roadmap) : roadmap));
  const updateSelected = (transform: (roadmap: Roadmap) => Roadmap) => { if (selected) updateRoadmap(selected.id, transform); };
  const reorderTrack = (trackId: string, direction: -1 | 1) => updateSelected((roadmap) => moveTrack(roadmap, trackId, direction));
  const reorderPhase = (trackId: string, phaseId: string, direction: -1 | 1) => updateSelected((roadmap) => movePhase(roadmap, trackId, phaseId, direction));
  const addRoadmap = (draft: RoadmapDraft) => {
    const roadmap = emptyRoadmap(draft);
    roadmap.status = 'not-started';
    setRoadmaps((current) => [roadmap, ...current]);
    setRoadmapDialog(null);
    setNotice('Roadmap created. Add a track to plan your first steps.');
  };
  const saveRoadmap = (draft: RoadmapDraft) => {
    if (!selected || roadmapDialog === 'new') return addRoadmap(draft);
    const currentProgress = roadmapProgress(selected);
    if (draft.status === 'completed' && (!currentProgress.total || currentProgress.done !== currentProgress.total)) {
      setNotice('Complete every task before marking this roadmap completed.');
      setRoadmapDialog(null);
      return;
    }
    updateRoadmap(selected.id, (roadmap) => {
      const updated = { ...roadmap, ...draft, tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean), updatedAt: new Date().toISOString() };
      return { ...updated, status: deriveRoadmapStatus(updated) };
    });
    setRoadmapDialog(null);
    setNotice('Roadmap details saved.');
  };
  const duplicateRoadmap = (source: Roadmap) => {
    const copy = cloneRoadmap(source);
    setRoadmaps((current) => [copy, ...current]); setNotice('Roadmap duplicated.');
  };
  const archiveRoadmap = (roadmap: Roadmap) => {
    if (!window.confirm(`${roadmap.archived ? 'Restore' : 'Archive'} “${roadmap.title}”?`)) return;
    updateRoadmap(roadmap.id, (item) => ({ ...item, archived: !item.archived, updatedAt: new Date().toISOString() }));
    if (!roadmap.archived && selectedId === roadmap.id) setSelectedId(null);
    setNotice(roadmap.archived ? 'Roadmap restored.' : 'Roadmap archived.');
  };
  const deleteRoadmap = (roadmap: Roadmap) => {
    if (!window.confirm(`Permanently delete “${roadmap.title}” and all of its tasks? This cannot be undone.`)) return;
    setRoadmaps((current) => current.filter((item) => item.id !== roadmap.id));
    if (selectedId === roadmap.id) setSelectedId(null);
    setNotice('Roadmap deleted.');
  };
  const saveTask = (draft: TaskDraft) => {
    if (!selected || !taskDialog) return;
    const item = taskDraft(draft, taskDialog.task);
    updateSelected((roadmap) => {
      const tracks = roadmap.tracks.map((track) => ({ ...track, phases: track.phases.map((phase) => {
        if (track.id !== taskDialog.trackId || phase.id !== taskDialog.phaseId) return phase;
        const tasks = taskDialog.task ? phase.tasks.map((task) => task.id === item.id ? item : task) : [...phase.tasks, { ...item, order: phase.tasks.length }];
        return { ...phase, tasks };
      }) }));
      const updated = { ...roadmap, tracks, updatedAt: new Date().toISOString() };
      return { ...updated, status: deriveRoadmapStatus(updated) };
    });
    setTaskDialog(null); setNotice(taskDialog.task ? 'Task updated.' : 'Task added.');
  };
  const toggleTask = (task: RoadmapTask) => {
    if (!selected) return;
    const status: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateSelected((roadmap) => { const updated = setTaskStatus(roadmap, task.id, status); return { ...updated, status: deriveRoadmapStatus(updated) }; });
    setNotice(status === 'completed' ? 'Nice work — task complete.' : 'Task reopened.');
  };
  const changeTaskStatus = (task: RoadmapTask, status: TaskStatus) => {
    if (!selected) return;
    updateSelected((roadmap) => { const updated = setTaskStatus(roadmap, task.id, status); return { ...updated, status: deriveRoadmapStatus(updated) }; });
  };
  const saveEntry = (title: string, color?: RoadmapTrack['color']) => {
    if (!selected || !entryDialog || !title.trim()) return;
    updateSelected((roadmap) => {
      let tracks = [...roadmap.tracks];
      if (entryDialog.kind === 'track') {
        const previous = entryDialog.trackId ? tracks.find((track) => track.id === entryDialog.trackId) : undefined;
        if (previous) tracks = tracks.map((track) => track.id === previous.id ? { ...track, title: title.trim(), color: color ?? track.color } : track);
        else tracks.push({ id: newId(), title: title.trim(), color: color ?? 'mint', order: tracks.length, phases: [] });
      } else {
        tracks = tracks.map((track) => {
          if (track.id !== entryDialog.trackId) return track;
          const previous = track.phases.find((phase) => phase.id === entryDialog.phaseId);
          const phases = previous
            ? track.phases.map((phase) => phase.id === previous.id ? { ...phase, title: title.trim() } : phase)
            : [...track.phases, { id: newId(), title: title.trim(), description: '', order: track.phases.length, tasks: [] }];
          return { ...track, phases };
        });
      }
      const updated = { ...roadmap, tracks, updatedAt: new Date().toISOString() };
      return { ...updated, status: deriveRoadmapStatus(updated) };
    });
    setEntryDialog(null); setNotice(`${entryDialog.kind === 'track' ? 'Track' : 'Phase'} saved.`);
  };
  const deleteTrack = (track: RoadmapTrack) => {
    if (!selected || !window.confirm(`Delete “${track.title}” and all nested phases and tasks?`)) return;
    const deletedIds = new Set(track.phases.flatMap((phase) => phase.tasks.map((task) => task.id)));
    updateSelected((roadmap) => { const updated = { ...roadmap, tracks: roadmap.tracks.filter((item) => item.id !== track.id).map((item) => ({ ...item, phases: item.phases.map((phase) => ({ ...phase, tasks: phase.tasks.map((task) => ({ ...task, dependencyIds: task.dependencyIds.filter((id) => !deletedIds.has(id)) })) })) })), updatedAt: new Date().toISOString() }; return { ...updated, status: deriveRoadmapStatus(updated) }; });
    setNotice('Track deleted.');
  };
  const deletePhase = (track: RoadmapTrack, phase: RoadmapPhase) => {
    if (!selected || !window.confirm(`Delete “${phase.title}” and its tasks?`)) return;
    const deletedIds = new Set(phase.tasks.map((task) => task.id));
    updateSelected((roadmap) => { const updated = { ...roadmap, tracks: roadmap.tracks.map((item) => ({ ...item, phases: item.phases.filter((child) => item.id !== track.id || child.id !== phase.id).map((child) => ({ ...child, tasks: child.tasks.map((task) => ({ ...task, dependencyIds: task.dependencyIds.filter((id) => !deletedIds.has(id)) })) })) })), updatedAt: new Date().toISOString() }; return { ...updated, status: deriveRoadmapStatus(updated) }; });
    setNotice('Phase deleted.');
  };
  const deleteTask = (task: RoadmapTask) => {
    if (!selected || !window.confirm(`Delete “${task.title}”?`)) return;
    updateSelected((roadmap) => { const updated = { ...roadmap, tracks: roadmap.tracks.map((track) => ({ ...track, phases: track.phases.map((phase) => ({ ...phase, tasks: phase.tasks.filter((item) => item.id !== task.id).map((item, order) => ({ ...item, order, dependencyIds: item.dependencyIds.filter((id) => id !== task.id) })) })) })), updatedAt: new Date().toISOString() }; return { ...updated, status: deriveRoadmapStatus(updated) }; });
    setNotice('Task deleted.');
  };

  const upcoming = allTasks.filter((task) => task.status !== 'completed' && task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const recentTasks = allTasks.filter((task) => task.status === 'completed').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);

  return <div className="planner-page" id="planner">
    <header className="planner-topbar"><div className="planner-crumb">FIELDNOTES <span>/</span> PLANNER</div><div className="planner-top-note"><span className="planner-live-dot"/> YOUR NEXT CHAPTER, IN FOCUS</div></header>
    {storageError && <div className="planner-storage-alert" role="alert">Couldn’t save changes in this browser. Check that local storage is available, then refresh to retry.</div>}
    {notice && <div className="planner-toast" role="status">✓ <span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
    {selected ? <RoadmapWorkspace roadmap={selected} view={view} setView={setView} onBack={() => setSelectedId(null)} onEdit={() => setRoadmapDialog(selected)} onAddTrack={() => setEntryDialog({ kind: 'track', title: '' })} onEditTrack={(track) => setEntryDialog({ kind: 'track', trackId: track.id, title: track.title, color: track.color })} onDeleteTrack={deleteTrack} onMoveTrack={reorderTrack} onAddPhase={(track) => setEntryDialog({ kind: 'phase', trackId: track.id, title: '' })} onEditPhase={(track, phase) => setEntryDialog({ kind: 'phase', trackId: track.id, phaseId: phase.id, title: phase.title })} onDeletePhase={deletePhase} onMovePhase={reorderPhase} onAddTask={(track, phase) => setTaskDialog({ trackId: track.id, phaseId: phase.id })} onEditTask={(track, phase, task) => setTaskDialog({ trackId: track.id, phaseId: phase.id, task })} onToggleTask={toggleTask} onChangeTaskStatus={changeTaskStatus} onMoveTask={(taskId, direction) => updateSelected((roadmap) => moveTask(roadmap, taskId, direction))} onDeleteTask={deleteTask} />
      : <>
        <section className="planner-hero"><div><span className="planner-eyebrow"><i className="planner-live-dot"/> YOUR PERSONAL ROUTE PLANNER</span><h1>Planner<span>.</span></h1><p>Turn your bigger goals into clear steps. One thoughtful move at a time.</p></div><button className="planner-primary-btn create-roadmap-btn" onClick={() => setRoadmapDialog('new')}><span>＋</span> Create roadmap</button></section>
        <section className="planner-stats" aria-label="Planner overview">
          <StatCard label="TOTAL ROADMAPS" value={roadmapStats.total} hint="Personal goals in motion" icon="◈" color="mint" />
          <StatCard label="IN PROGRESS" value={roadmapStats.inProgress} hint="Keep the rhythm going" icon="⌁" color="blue" />
          <StatCard label="TASKS COMPLETED" value={roadmapStats.completedTasks} hint="Every step counts" icon="✓" color="violet" />
          <StatCard label="DUE SOON / OVERDUE" value={roadmapStats.dueTasks} hint="Next 7 days + past due" icon="◷" color="amber" />
        </section>
        <section className="planner-collection" id="roadmaps">
          <div className="planner-section-heading"><div><span className="planner-eyebrow">THE BIG PICTURE</span><h2>{showArchived ? 'Archived roadmaps' : 'Your roadmaps'} <span>{filtered.length.toString().padStart(2, '0')}</span></h2></div><button className="planner-text-btn" onClick={() => setShowArchived((value) => !value)}>{showArchived ? '← Active roadmaps' : 'View archive'} <span>↗</span></button></div>
          <div className="planner-toolbar"><label className="planner-search"><span>⌕</span><input ref={searchInput} aria-label="Search roadmaps" placeholder="Search goals, tags, categories…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></label><label className="planner-select"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="on-hold">On hold</option><option value="completed">Completed</option></select></label><label className="planner-select"><span className="sr-only">Filter by category</span><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="planner-select sort-select"><span className="sr-only">Sort roadmaps</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}><option value="updated">Recently updated</option><option value="deadline">Target date</option><option value="progress">Progress</option><option value="priority">Priority</option></select></label><div className="planner-layout-switch" aria-label="Roadmap card layout"><button className={layout === 'grid' ? 'selected' : ''} onClick={() => setLayout('grid')} aria-label="Grid view">▦</button><button className={layout === 'list' ? 'selected' : ''} onClick={() => setLayout('list')} aria-label="List view">☷</button></div></div>
          {filtered.length ? <div className={`roadmap-grid ${layout === 'list' ? 'list-layout' : ''}`}>{filtered.map((roadmap) => <RoadmapCard key={roadmap.id} roadmap={roadmap} onOpen={() => setSelectedId(roadmap.id)} onEdit={() => setRoadmapDialog(roadmap)} onDuplicate={() => duplicateRoadmap(roadmap)} onArchive={() => archiveRoadmap(roadmap)} onDelete={() => deleteRoadmap(roadmap)} />)}</div>
            : <div className="planner-empty"><span>✳</span><h3>{search || statusFilter !== 'all' || categoryFilter !== 'all' ? 'No roadmaps match those filters' : showArchived ? 'Nothing archived yet' : 'Give a good goal a place to grow.'}</h3><p>{search || statusFilter !== 'all' || categoryFilter !== 'all' ? 'Try a different search or clear a filter.' : 'Start with one outcome you care about. You can shape the route as you learn.'}</p>{!search && statusFilter === 'all' && categoryFilter === 'all' && !showArchived && <button className="planner-primary-btn" onClick={() => setRoadmapDialog('new')}>Create your first roadmap</button>}</div>}
        </section>
        <section className="planner-lower-grid">
          <section className="planner-lower-panel" id="upcoming"><div className="planner-section-heading compact"><div><span className="planner-eyebrow">AHEAD ON THE PATH</span><h2>Upcoming tasks <span>{upcoming.length.toString().padStart(2, '0')}</span></h2></div></div>{upcoming.length ? <div className="planner-task-list">{upcoming.map((task) => <button className="upcoming-task" key={task.id} onClick={() => setSelectedId(task.roadmapId)}><span className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={(event) => { event.stopPropagation(); const parent = roadmaps.find((roadmap) => roadmap.id === task.roadmapId); if (parent) updateRoadmap(parent.id, (roadmap) => { const updated = setTaskStatus(roadmap, task.id, 'completed'); return { ...updated, status: deriveRoadmapStatus(updated) }; }); }}>✓</span><span className="upcoming-task-copy"><strong>{task.title}</strong><small>{task.roadmapTitle}</small></span><span className={`task-deadline ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>{isOverdue(task.dueDate) ? 'OVERDUE' : shortDate(task.dueDate)}</span><span className="task-open-arrow">↗</span></button>)}</div> : <div className="planner-small-empty">No dated tasks yet. Add a due date inside a roadmap to see it here.</div>}</section>
          <section className="planner-lower-panel" id="activity"><div className="planner-section-heading compact"><div><span className="planner-eyebrow">MOMENTUM, MADE VISIBLE</span><h2>Recent completions <span>{recentTasks.length.toString().padStart(2, '0')}</span></h2></div></div>{recentTasks.length ? <div className="planner-activity-list">{recentTasks.map((task) => <div className="planner-activity" key={task.id}><span className="activity-check">✓</span><div><strong>{task.title}</strong><small>{task.roadmapTitle}</small></div><time>{shortDate(task.updatedAt.slice(0, 10))}</time></div>)}</div> : <div className="planner-small-empty">Finished steps will show up here. Start anywhere.</div>}</section>
        </section>
      </>}
    <footer className="planner-footer"><span>FIELDNOTES · PERSONAL WORKSHOP</span><span>Make, measure, learn, repeat. <i>✳</i></span></footer>
    {roadmapDialog && <RoadmapDialog roadmap={roadmapDialog === 'new' ? undefined : roadmapDialog} onClose={() => setRoadmapDialog(null)} onSave={saveRoadmap} />}
    {taskDialog && selected && <TaskDialog task={taskDialog.task} tasks={flattenTasks(selected)} onClose={() => setTaskDialog(null)} onSave={saveTask} />}
    {entryDialog && <EntryForm dialog={entryDialog} onClose={() => setEntryDialog(null)} onSave={saveEntry} />}
  </div>;
}

function StatCard({ label, value, hint, icon, color }: { label: string; value: number; hint: string; icon: string; color: string }) {
  return <article className="planner-stat-card"><div className={`planner-stat-icon ${color}`}>{icon}</div><span className="planner-stat-label">{label}</span><strong>{value.toString().padStart(2, '0')}</strong><small>{hint}</small><i className={`stat-orbit ${color}`} /></article>;
}

function RoadmapCard({ roadmap, onOpen, onEdit, onDuplicate, onArchive, onDelete }: { roadmap: Roadmap; onOpen: () => void; onEdit: () => void; onDuplicate: () => void; onArchive: () => void; onDelete: () => void }) {
  const progress = roadmapProgress(roadmap);
  const next = flattenTasks(roadmap).filter((task) => task.status !== 'completed').sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))[0];
  return <article className={`roadmap-card accent-${roadmap.color}`}><button className="roadmap-card-open" onClick={onOpen} aria-label={`Open ${roadmap.title}`}><div className="roadmap-card-top"><span className={`roadmap-icon ${roadmap.color}`}>{roadmap.icon}</span><span className={`planner-status ${roadmap.status}`}>{roadmap.status.replace('-', ' ')}</span><span className={`priority-indicator ${roadmap.priority}`}>{roadmap.priority}</span></div><div className="roadmap-card-title-row"><div><h3>{roadmap.title}{roadmap.sample && <span className="sample-badge">SAMPLE</span>}</h3><p>{roadmap.description || 'A goal taking shape, one step at a time.'}</p></div></div><div className="roadmap-card-tags"><span className="category-tag">{roadmap.category || 'Personal'}</span>{roadmap.tags.slice(0, 2).map((tag) => <span className="roadmap-tag" key={tag}>{tag}</span>)}{roadmap.tracks.length > 0 && <span className="track-count">{roadmap.tracks.length} tracks</span>}</div><div className="roadmap-progress-header"><span>ROADMAP PROGRESS</span><b>{progress.percent}%</b></div><div className="roadmap-progress-track"><i style={{ width: `${progress.percent}%` }} /></div><div className="roadmap-card-foot"><span>{progress.done} / {progress.total} tasks done</span><span>Target <b>{toDate(roadmap.targetDate)}</b></span></div><div className="roadmap-next-task"><span>UP NEXT</span><strong>{next?.title ?? (progress.total ? 'All steps complete' : 'Add your first task')}</strong></div></button><details className="roadmap-menu"><summary aria-label="Roadmap actions">···</summary><div><button onClick={onEdit}>Edit roadmap</button><button onClick={onDuplicate}>Duplicate</button><button onClick={onArchive}>{roadmap.archived ? 'Restore' : 'Archive'}</button><button className="danger-action" onClick={onDelete}>Delete permanently</button></div></details></article>;
}

interface WorkspaceProps {
  roadmap: Roadmap; view: PlannerView; setView: (view: PlannerView) => void; onBack: () => void; onEdit: () => void;
  onAddTrack: () => void; onEditTrack: (track: RoadmapTrack) => void; onDeleteTrack: (track: RoadmapTrack) => void;
  onMoveTrack: (trackId: string, direction: -1 | 1) => void; onAddPhase: (track: RoadmapTrack) => void; onEditPhase: (track: RoadmapTrack, phase: RoadmapPhase) => void; onDeletePhase: (track: RoadmapTrack, phase: RoadmapPhase) => void; onMovePhase: (trackId: string, phaseId: string, direction: -1 | 1) => void;
  onAddTask: (track: RoadmapTrack, phase: RoadmapPhase) => void; onEditTask: (track: RoadmapTrack, phase: RoadmapPhase, task: RoadmapTask) => void;
  onToggleTask: (task: RoadmapTask) => void; onChangeTaskStatus: (task: RoadmapTask, status: TaskStatus) => void;
  onMoveTask: (taskId: string, direction: -1 | 1) => void; onDeleteTask: (task: RoadmapTask) => void;
}

function RoadmapWorkspace(props: WorkspaceProps) {
  const { roadmap, view, setView } = props;
  const progress = roadmapProgress(roadmap);
  const tracks = [...roadmap.tracks].sort((a, b) => a.order - b.order);
  const tasks = flattenTasks(roadmap);
  const upcoming = tasks.filter((task) => task.status !== 'completed' && task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 3);
  const dependencyNames = new Map(tasks.map((task) => [task.id, task.title]));
  return <div className="roadmap-workspace">
    <button className="workspace-back" onClick={props.onBack}>← <span>All roadmaps</span></button>
    <section className="workspace-hero"><div className="workspace-title-wrap"><span className={`roadmap-icon large ${roadmap.color}`}>{roadmap.icon}</span><div><div className="workspace-kicker"><span className={`planner-status ${roadmap.status}`}>{roadmap.status.replace('-', ' ')}</span><span>{roadmap.category}</span><span>·</span><span>{roadmap.priority} priority</span></div><h1>{roadmap.title}</h1><p>{roadmap.description || 'Keep your next steps clear and your progress visible.'}</p><div className="workspace-tags">{roadmap.tags.map((tag) => <span className="roadmap-tag" key={tag}>{tag}</span>)}{roadmap.sample && <span className="sample-badge">SAMPLE ROADMAP · EDIT OR DELETE ANYTIME</span>}</div></div></div><button className="planner-secondary-btn" onClick={props.onEdit}>Edit details</button></section>
    <section className="workspace-progress"><div><span className="planner-eyebrow">YOUR PROGRESS</span><strong>{progress.percent}<small>%</small></strong><span className="progress-caption">{progress.done} of {progress.total} tasks complete · {Math.max(progress.total - progress.done, 0)} remaining</span></div><div className="workspace-progress-track"><i style={{ width: `${progress.percent}%` }} /></div><div className="workspace-dates"><span>STARTED <b>{toDate(roadmap.startDate)}</b></span><span>TARGET <b>{toDate(roadmap.targetDate)}</b></span></div></section>
    <div className="workspace-section-heading"><div><span className="planner-eyebrow">THE WORK, IN ORDER</span><h2>Roadmap outline</h2></div><div className="workspace-heading-actions"><div className="planner-view-tabs" aria-label="Roadmap view"><button className={view === 'outline' ? 'active' : ''} onClick={() => setView('outline')}>☷ <span>Outline</span></button><button className={view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>↗ <span>Timeline</span></button><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>▦ <span>Board</span></button></div><button className="planner-primary-btn add-track-btn" onClick={props.onAddTrack}>＋ Add track</button></div></div>
    <div className="workspace-content">
      <section className="workspace-main">
        {view === 'outline' && (tracks.length ? <div className="track-list">{tracks.map((track, index) => <TrackOutline key={track.id} track={track} trackIndex={index} trackCount={tracks.length} {...props} dependencyNames={dependencyNames} />)}</div> : <div className="workspace-empty"><span>◈</span><h3>Start with a track</h3><p>Tracks are the main areas of work inside this goal.</p><button className="planner-primary-btn" onClick={props.onAddTrack}>＋ Create your first track</button></div>)}
        {view === 'timeline' && <TimelineView roadmap={roadmap} tasks={tasks} onToggleTask={props.onToggleTask} />}
        {view === 'board' && <BoardView tasks={tasks} onChangeTaskStatus={props.onChangeTaskStatus} onEditTask={(task) => { const found = locateTask(roadmap, task.id); if (found) props.onEditTask(found.track, found.phase, task); }} />}
      </section>
      <aside className="workspace-side"><section className="workspace-side-card"><div className="planner-eyebrow">NEXT DUE</div>{upcoming.length ? upcoming.map((task) => <div className="side-deadline" key={task.id}><i className={isOverdue(task.dueDate) ? 'overdue' : ''}/><div><strong>{task.title}</strong><small>{shortDate(task.dueDate)} {isOverdue(task.dueDate) && '· overdue'}</small></div></div>) : <p className="workspace-aside-empty">No deadlines set yet.</p>}</section><section className="workspace-side-card"><div className="planner-eyebrow">MILESTONES</div><strong className="side-big-number">{tasks.filter((task) => task.milestone && task.status === 'completed').length}<small> / {tasks.filter((task) => task.milestone).length} complete</small></strong><p className="workspace-aside-empty">{tasks.filter((task) => task.milestone && task.status !== 'completed').length ? 'Keep an eye on your checkpoints as you move forward.' : 'Mark important checkpoints on the tasks that matter most.'}</p></section></aside>
    </div>
  </div>;
}

function TrackOutline({ track, trackIndex, trackCount, dependencyNames, onEditTrack, onDeleteTrack, onMoveTrack, onAddPhase, onEditPhase, onDeletePhase, onMovePhase, onAddTask, onEditTask, onToggleTask, onMoveTask, onDeleteTask }: WorkspaceProps & { track: RoadmapTrack; trackIndex: number; trackCount: number; dependencyNames: Map<string, string> }) {
  const progress = trackProgress(track);
  const phases = [...track.phases].sort((a, b) => a.order - b.order);
  return <details className="track-block" open><summary className="track-summary"><span className={`track-color-dot ${track.color}`}/><span className="track-summary-title">{track.title}</span><span className="track-summary-progress">{progress.done}/{progress.total} tasks <i><b style={{ width: `${progress.percent}%` }}/></i></span><span className="track-chevron">⌄</span></summary><div className="track-actions"><button disabled={trackIndex === 0} onClick={() => onMoveTrack(track.id, -1)}>↑ Move up</button><button disabled={trackIndex === trackCount - 1} onClick={() => onMoveTrack(track.id, 1)}>↓ Move down</button><button onClick={() => onEditTrack(track)}>Rename track</button><button className="danger-action" onClick={() => onDeleteTrack(track)}>Delete track</button></div>
    <div className="track-phases">{phases.map((phase, phaseIndex) => <details className="phase-block" key={phase.id} open><summary className="phase-summary"><span className="phase-caret">⌄</span><span className="phase-title">{phase.title}</span><span className="phase-count">{phaseProgress(phase).done}/{phaseProgress(phase).total}</span><span className="phase-menu"><button disabled={phaseIndex === 0} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onMovePhase(track.id, phase.id, -1); }} aria-label="Move phase up">↑</button><button disabled={phaseIndex === phases.length - 1} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onMovePhase(track.id, phase.id, 1); }} aria-label="Move phase down">↓</button><button onClick={(event) => { event.preventDefault(); event.stopPropagation(); onEditPhase(track, phase); }}>Rename</button><button className="danger-action" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onDeletePhase(track, phase); }}>Delete</button></span></summary>{phase.description && <p className="phase-description">{phase.description}</p>}<div className="phase-tasks">{[...phase.tasks].sort((a, b) => a.order - b.order).map((task, index) => <TaskRow key={task.id} task={task} index={index} taskCount={phase.tasks.length} dependencyName={task.dependencyIds.map((id) => dependencyNames.get(id)).filter(Boolean).join(', ')} onToggle={onToggleTask} onEdit={() => onEditTask(track, phase, task)} onMove={(direction) => onMoveTask(task.id, direction)} onDelete={() => onDeleteTask(task)} />)}</div><button className="add-task-inline" onClick={() => onAddTask(track, phase)}>＋ Add a task</button></details>)}<button className="add-phase-inline" onClick={() => onAddPhase(track)}>＋ Add phase</button></div>
  </details>;
}

function TaskRow({ task, index, taskCount, dependencyName, onToggle, onEdit, onMove, onDelete }: { task: RoadmapTask; index: number; taskCount: number; dependencyName: string; onToggle: (task: RoadmapTask) => void; onEdit: () => void; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  const dueClass = isOverdue(task.dueDate) && task.status !== 'completed' ? 'overdue' : isDueSoon(task.dueDate) ? 'due-soon' : '';
  return <article className={`outline-task ${task.status === 'completed' ? 'is-complete' : ''} ${task.status === 'blocked' ? 'is-blocked' : ''}`}><button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => onToggle(task)} aria-label={task.status === 'completed' ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.status === 'completed' ? '✓' : ''}</button><div className="outline-task-copy"><div className="outline-task-title">{task.milestone && <span className="milestone-star">✳</span>}{task.title}<span className={`task-priority ${task.priority}`}>{task.priority}</span>{task.status === 'blocked' && <span className="blocked-pill">BLOCKED</span>}</div>{task.description && <p>{task.description}</p>}<div className="task-meta">{task.dueDate && <span className={dueClass}>◷ {shortDate(task.dueDate)}{dueClass === 'overdue' ? ' · overdue' : ''}</span>}{task.estimateMinutes > 0 && <span>◴ {task.estimateMinutes} min</span>}{dependencyName && <span>↳ after {dependencyName}</span>}{task.resourceUrl && <a href={task.resourceUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>↗ Resource</a>}{task.completionCriteria && <span>Done when: {task.completionCriteria}</span>}{task.notes && <span>Notes: {task.notes}</span>}</div></div><div className="task-row-actions"><button disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${task.title} up`}>↑</button><button disabled={index === taskCount - 1} onClick={() => onMove(1)} aria-label={`Move ${task.title} down`}>↓</button><button onClick={onEdit} aria-label={`Edit ${task.title}`}>✎</button><button className="danger-action" onClick={onDelete} aria-label={`Delete ${task.title}`}>×</button></div></article>;
}

function TimelineView({ roadmap, tasks, onToggleTask }: { roadmap: Roadmap; tasks: RoadmapTask[]; onToggleTask: (task: RoadmapTask) => void }) {
  const locations = new Map<string, string>();
  roadmap.tracks.forEach((track) => track.phases.forEach((phase) => phase.tasks.forEach((task) => locations.set(task.id, `${track.title} / ${phase.title}`))));
  const ordered = tasks.filter((task) => task.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return <div className="timeline-view"><div className="timeline-head"><span>DATE</span><span>PLAN</span></div>{ordered.length ? ordered.map((task) => <article className={`timeline-item ${task.status === 'completed' ? 'done' : ''}`} key={task.id}><div className="timeline-date"><i className={task.milestone ? 'milestone' : ''}/>{shortDate(task.dueDate)}</div><button className={`task-check ${task.status === 'completed' ? 'checked' : ''}`} onClick={() => onToggleTask(task)} aria-label={`Toggle ${task.title}`}>{task.status === 'completed' ? '✓' : ''}</button><div><strong>{task.milestone && '✳ '}{task.title}</strong><small>{locations.get(task.id)} · {task.priority} priority</small></div></article>) : <div className="planner-small-empty">Add due dates to tasks to see your plan along a timeline.</div>}</div>;
}

function BoardView({ tasks, onChangeTaskStatus, onEditTask }: { tasks: RoadmapTask[]; onChangeTaskStatus: (task: RoadmapTask, status: TaskStatus) => void; onEditTask: (task: RoadmapTask) => void }) {
  const columns: { status: TaskStatus; label: string }[] = [{ status: 'todo', label: 'Not started' }, { status: 'in-progress', label: 'In progress' }, { status: 'blocked', label: 'Blocked' }, { status: 'completed', label: 'Completed' }];
  return <div className="kanban-board">{columns.map((column) => <section className={`kanban-column ${column.status}`} key={column.status}><header><span>{column.label}</span><b>{tasks.filter((task) => task.status === column.status).length}</b></header>{tasks.filter((task) => task.status === column.status).map((task) => <article className="kanban-task" key={task.id}><button onClick={() => onEditTask(task)}><strong>{task.milestone && '✳ '}{task.title}</strong><small>{task.description || task.completionCriteria || 'No description yet'}</small></button><footer><span className={`task-priority ${task.priority}`}>{task.priority}</span>{task.dueDate && <time className={isOverdue(task.dueDate) && task.status !== 'completed' ? 'overdue' : ''}>{shortDate(task.dueDate)}</time>}<select aria-label={`Move ${task.title} to status`} value={task.status} onChange={(event) => onChangeTaskStatus(task, event.target.value as TaskStatus)}>{taskStatuses.map((status) => <option key={status} value={status}>{status.replace('-', ' ')}</option>)}</select></footer></article>)}</section>)}</div>;
}

function locateTask(roadmap: Roadmap, taskId: string): { track: RoadmapTrack; phase: RoadmapPhase } | undefined {
  for (const track of roadmap.tracks) for (const phase of track.phases) if (phase.tasks.some((task) => task.id === taskId)) return { track, phase };
  return undefined;
}

function EntryForm({ dialog, onClose, onSave }: { dialog: NonNullable<EntryDialog>; onClose: () => void; onSave: (title: string, color?: RoadmapTrack['color']) => void }) {
  const [title, setTitle] = useState(dialog.title);
  const [color, setColor] = useState<RoadmapTrack['color']>(dialog.color ?? 'mint');
  return <div className="planner-scrim" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="planner-dialog entry-dialog" role="dialog" aria-modal="true" onSubmit={(event) => { event.preventDefault(); onSave(title, color); }}><div className="planner-dialog-head"><div><span className="planner-eyebrow">ROADMAP STRUCTURE</span><h2>{dialog.title ? `Edit ${dialog.kind}` : `Add ${dialog.kind}`}</h2></div><button type="button" className="planner-icon-btn" onClick={onClose} aria-label="Close">×</button></div><label className="planner-field full">{dialog.kind} name<input autoFocus maxLength={80} required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={dialog.kind === 'track' ? 'e.g. Embedded systems' : 'e.g. Motor control fundamentals'} /></label>{dialog.kind === 'track' && <label className="planner-field full">Track accent<select value={color} onChange={(event) => setColor(event.target.value as RoadmapTrack['color'])}><option value="mint">Mint</option><option value="amber">Amber</option><option value="violet">Violet</option><option value="blue">Blue</option></select></label>}<div className="planner-dialog-actions"><button type="button" className="planner-secondary-btn" onClick={onClose}>Cancel</button><button className="planner-primary-btn" type="submit">Save {dialog.kind}</button></div></form></div>;
}
