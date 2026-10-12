import type { Roadmap, RoadmapPhase, RoadmapTask, RoadmapTrack, TaskStatus } from './types';

export function flattenTasks(roadmap: Roadmap): RoadmapTask[] {
  return [...roadmap.tracks]
    .sort((a, b) => a.order - b.order)
    .flatMap((track) => [...track.phases]
      .sort((a, b) => a.order - b.order)
      .flatMap((phase) => [...phase.tasks].sort((a, b) => a.order - b.order)));
}

export function taskProgress(tasks: RoadmapTask[]): { done: number; total: number; percent: number } {
  const done = tasks.filter((task) => task.status === 'completed').length;
  return { done, total: tasks.length, percent: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100) };
}

export function phaseProgress(phase: RoadmapPhase) {
  return taskProgress(phase.tasks);
}

export function trackProgress(track: RoadmapTrack) {
  return taskProgress(track.phases.flatMap((phase) => phase.tasks));
}

export function roadmapProgress(roadmap: Roadmap) {
  return taskProgress(flattenTasks(roadmap));
}

export function deriveRoadmapStatus(roadmap: Roadmap): Roadmap['status'] {
  if (roadmap.status === 'on-hold') return 'on-hold';
  const progress = roadmapProgress(roadmap);
  if (progress.total > 0 && progress.done === progress.total) return 'completed';
  if (progress.done > 0 || roadmap.tracks.length > 0) return 'in-progress';
  return 'not-started';
}

export function setTaskStatus(roadmap: Roadmap, taskId: string, status: TaskStatus): Roadmap {
  const now = new Date().toISOString();
  return {
    ...roadmap,
    tracks: roadmap.tracks.map((track) => ({
      ...track,
      phases: track.phases.map((phase) => ({
        ...phase,
        tasks: phase.tasks.map((task) => task.id === taskId ? { ...task, status, blocked: status === 'blocked', updatedAt: now } : task),
      })),
    })),
    updatedAt: now,
  };
}

export function moveTask(roadmap: Roadmap, taskId: string, direction: -1 | 1): Roadmap {
  const tracks = roadmap.tracks.map((track) => ({
    ...track,
    phases: track.phases.map((phase) => {
      const sorted = [...phase.tasks].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((task) => task.id === taskId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= sorted.length) return phase;
      [sorted[index], sorted[nextIndex]] = [sorted[nextIndex], sorted[index]];
      return { ...phase, tasks: sorted.map((task, order) => ({ ...task, order })) };
    }),
  }));
  return { ...roadmap, tracks, updatedAt: new Date().toISOString() };
}

export function moveTrack(roadmap: Roadmap, trackId: string, direction: -1 | 1): Roadmap {
  const tracks = [...roadmap.tracks].sort((a, b) => a.order - b.order);
  const index = tracks.findIndex((track) => track.id === trackId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= tracks.length) return roadmap;
  [tracks[index], tracks[nextIndex]] = [tracks[nextIndex], tracks[index]];
  return { ...roadmap, tracks: tracks.map((track, order) => ({ ...track, order })), updatedAt: new Date().toISOString() };
}

export function movePhase(roadmap: Roadmap, trackId: string, phaseId: string, direction: -1 | 1): Roadmap {
  return { ...roadmap, tracks: roadmap.tracks.map((track) => {
    if (track.id !== trackId) return track;
    const phases = [...track.phases].sort((a, b) => a.order - b.order);
    const index = phases.findIndex((phase) => phase.id === phaseId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= phases.length) return track;
    [phases[index], phases[nextIndex]] = [phases[nextIndex], phases[index]];
    return { ...track, phases: phases.map((phase, order) => ({ ...phase, order })) };
  }), updatedAt: new Date().toISOString() };
}
