import type { Roadmap } from './types';

const STORAGE_KEY = 'fieldnotes.planner.roadmaps.v1';
const now = new Date();
const date = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86_400_000).toISOString().slice(0, 10);
const stamp = now.toISOString();
const id = () => crypto.randomUUID();

function sampleTask(title: string, description: string, offset: number, order: number, extra: Partial<Roadmap['tracks'][number]['phases'][number]['tasks'][number]> = {}) {
  return { id: id(), title, description, notes: '', status: 'todo' as const, priority: 'medium' as const, dueDate: date(offset), estimateMinutes: 45, milestone: false, blocked: false, dependencyIds: [], resourceUrl: '', completionCriteria: '', order, updatedAt: stamp, ...extra };
}

export function createSampleRoadmap(): Roadmap {
  const foundations = { id: id(), title: 'Foundations', description: 'Get the core ideas and tools in place.', order: 0, tasks: [
    sampleTask('Learn embedding and vector search concepts', 'Compare semantic search approaches and when to use each.', 2, 0, { status: 'completed', milestone: true }),
    sampleTask('Choose the technology stack', 'Pick the model, vector store, and application stack.', 5, 1),
  ] };
  const retrieval = { id: id(), title: 'Retrieval pipeline', description: 'Build an end-to-end retrieval loop.', order: 0, tasks: [
    sampleTask('Generate embeddings', 'Create and inspect vector representations.', 9, 0, { dependencyIds: [foundations.tasks[0].id] }),
    sampleTask('Configure vector storage', 'Persist vectors and metadata with a useful schema.', 13, 1, { milestone: true }),
    sampleTask('Implement semantic search', 'Return relevant passages with source references.', 17, 2, { priority: 'high' }),
  ] };
  const tracks: Roadmap['tracks'] = [
    { id: id(), title: 'Foundations', color: 'mint', order: 0, phases: [foundations] },
    { id: id(), title: 'Retrieval', color: 'violet', order: 1, phases: [retrieval] },
    { id: id(), title: 'App & deployment', color: 'blue', order: 2, phases: [{ id: id(), title: 'First release', description: 'Ship a useful, secure first version.', order: 0, tasks: [
      sampleTask('Build the API and planner interface', 'Create a focused user flow for searching personal notes.', 24, 0),
      sampleTask('Deploy with access controls', 'Deploy the app and verify private data access.', 31, 1, { priority: 'high', milestone: true }),
    ] }] },
  ];
  return { id: id(), title: 'Build a Personal RAG Assistant', description: 'A private assistant that searches my notes and answers with clear source citations.', category: 'Software project', icon: '⌘', color: 'mint', startDate: date(-7), targetDate: date(35), priority: 'high', status: 'in-progress', tags: ['AI', 'Full-stack', 'Learning'], tracks, createdAt: stamp, updatedAt: stamp, archived: false, sample: true };
}

export function loadRoadmaps(): Roadmap[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(isRoadmap)) return parsed;
    }
    const initial = [createSampleRoadmap()];
    saveRoadmaps(initial);
    return initial;
  } catch {
    return [];
  }
}

function isRoadmap(value: unknown): value is Roadmap {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Roadmap>;
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.description === 'string'
    && Array.isArray(item.tags) && Array.isArray(item.tracks) && ['low', 'medium', 'high', 'urgent'].includes(item.priority ?? '')
    && ['not-started', 'in-progress', 'on-hold', 'completed'].includes(item.status ?? '')
    && item.tracks.every((track) => {
      if (!track || typeof track.id !== 'string' || !Array.isArray(track.phases)) return false;
      return track.phases.every((phase) => {
        if (!phase || typeof phase.id !== 'string' || !Array.isArray(phase.tasks)) return false;
        return phase.tasks.every((task) => Boolean(task && typeof task.id === 'string' && typeof task.title === 'string'
          && ['todo', 'in-progress', 'blocked', 'completed'].includes(task.status)));
      });
    });
}

export function saveRoadmaps(roadmaps: Roadmap[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roadmaps));
}

export function newId(): string {
  return id();
}
