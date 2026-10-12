export type RoadmapStatus = 'not-started' | 'in-progress' | 'on-hold' | 'completed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'completed';
export type PlannerView = 'outline' | 'timeline' | 'board';

export interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  notes: string;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  estimateMinutes: number;
  milestone: boolean;
  blocked: boolean;
  dependencyIds: string[];
  resourceUrl: string;
  completionCriteria: string;
  order: number;
  updatedAt: string;
}

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  order: number;
  tasks: RoadmapTask[];
}

export interface RoadmapTrack {
  id: string;
  title: string;
  color: 'mint' | 'amber' | 'violet' | 'blue';
  order: number;
  phases: RoadmapPhase[];
}

export interface Roadmap {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: RoadmapTrack['color'];
  startDate: string;
  targetDate: string;
  priority: Priority;
  status: RoadmapStatus;
  tags: string[];
  tracks: RoadmapTrack[];
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  sample: boolean;
}

export interface RoadmapDraft {
  title: string;
  description: string;
  category: string;
  icon: string;
  color: RoadmapTrack['color'];
  startDate: string;
  targetDate: string;
  priority: Priority;
  status: RoadmapStatus;
  tags: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  notes: string;
  dueDate: string;
  priority: Priority;
  estimateMinutes: string;
  milestone: boolean;
  blocked: boolean;
  resourceUrl: string;
  completionCriteria: string;
  dependencyId: string;
}

export const EMPTY_ROADMAP_DRAFT: RoadmapDraft = {
  title: '', description: '', category: 'Personal growth', icon: '✳', color: 'mint',
  startDate: new Date().toISOString().slice(0, 10), targetDate: '', priority: 'medium',
  status: 'not-started', tags: '',
};

export const EMPTY_TASK_DRAFT: TaskDraft = {
  title: '', description: '', notes: '', dueDate: '', priority: 'medium', estimateMinutes: '',
  milestone: false, blocked: false, resourceUrl: '', completionCriteria: '', dependencyId: '',
};
