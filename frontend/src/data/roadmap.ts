export type DomainColor = 'mint' | 'amber' | 'violet' | 'blue';
export type MilestoneStatus = 'locked' | 'in-progress' | 'completed';

export interface EngineeringDomain {
  name: string;
  short: string;
  color: DomainColor;
  progress: number;
  skills: string[];
}

export interface Milestone {
  id: number;
  title: string;
  domain: string;
  status: MilestoneStatus;
  date: string;
  icon: string;
}

export interface EngineeringProject {
  name: string;
  type: string;
  progress: number;
  color: DomainColor;
  mark: string;
  repo: string;
}

export interface WeekDay {
  day: string;
  date: string;
  done?: boolean;
  today?: boolean;
}

export const domains: EngineeringDomain[] = [
  { name: 'Mechanical', short: 'ME', color: 'mint', progress: 68, skills: ['Parametric CAD', 'Mechanism design', 'FEA fundamentals'] },
  { name: 'Electrical', short: 'EE', color: 'amber', progress: 42, skills: ['Circuit design', 'PCB layout', 'Power systems'] },
  { name: 'Embedded', short: 'EM', color: 'violet', progress: 56, skills: ['C++ & drivers', 'RTOS', 'Edge ML'] },
  { name: 'Software', short: 'SW', color: 'blue', progress: 74, skills: ['Full-stack apps', 'APIs & data', 'Deployment'] },
];

export const milestones: Milestone[] = [
  { id: 1, title: 'Build a solid CAD foundation', domain: 'Mechanical', status: 'completed', date: 'APR 08', icon: '◈' },
  { id: 2, title: 'Design a closed-loop motor driver', domain: 'Embedded · Control', status: 'in-progress', date: 'MAY 16', icon: '⌁' },
  { id: 3, title: 'Spin a custom sensor PCB', domain: 'Electrical', status: 'locked', date: 'JUN 12', icon: '▦' },
  { id: 4, title: 'Deploy an edge vision model', domain: 'Embedded · ML', status: 'locked', date: 'JUL 24', icon: '⌘' },
];

export const projects: EngineeringProject[] = [
  { name: 'Balance bot v2', type: 'CONTROL SYSTEMS', progress: 72, color: 'mint', mark: '◎', repo: 'github.com/you/balance-bot' },
  { name: 'Modular sensor board', type: 'PCB DESIGN', progress: 28, color: 'amber', mark: '▦', repo: 'github.com/you/sensor-board' },
];

export const week: WeekDay[] = [
  { day: 'M', date: '12', done: true }, { day: 'T', date: '13', done: true },
  { day: 'W', date: '14', done: true }, { day: 'T', date: '15', done: false, today: true },
  { day: 'F', date: '16' }, { day: 'S', date: '17' }, { day: 'S', date: '18' },
];
