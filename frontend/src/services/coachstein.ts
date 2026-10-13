import type { Progress, Roadmap } from '../data/roadmap';

export interface CoachDashboard {
  roadmap: Roadmap;
  progress: Progress;
}

export interface GeneratedGuideline {
  title: string;
  guideline: string;
  stage_count: number;
  item_count: number;
}

export interface StageProgressAnalysis {
  id: string;
  number: number;
  title: string;
  done: number;
  total: number;
  percent: number;
  status: 'not-started' | 'in-progress' | 'complete';
}

export interface Recommendation {
  title: string;
  detail: string;
  next_step: string;
}

export interface ProgressAnalysis {
  roadmap_title: string;
  percent: number;
  completed_items: number;
  total_items: number;
  completed_stages: number;
  total_stages: number;
  stage_progress: StageProgressAnalysis[];
  summary: string;
  strengths: string[];
  recommendations: Recommendation[];
  weekly_focus: string;
}

export interface CoachChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const API_PREFIX = '/api/v1/ai';

async function aiRequest<T>(path: string, accessToken: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach the CoachStein API. Please try again.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : 'The AI request failed. Please try again.');
  }
  return response.json() as Promise<T>;
}

export function generateGuideline(
  accessToken: string,
  input: { learning_goal: string; current_level?: string; weekly_hours?: number; target_weeks?: number },
) {
  return aiRequest<GeneratedGuideline>('/guidelines', accessToken, input);
}

export function analyzeProgress(accessToken: string, dashboard: CoachDashboard) {
  return aiRequest<ProgressAnalysis>('/progress-analysis', accessToken, { dashboard });
}

export function sendChat(accessToken: string, messages: CoachChatMessage[]) {
  return aiRequest<{ reply: string }>('/chat', accessToken, { messages });
}
