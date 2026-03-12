export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  DONE = 'done',
  BLOCKED = 'blocked',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface LocalizedField {
  en: string;
  ar: string;
}

export interface CreateProjectData {
  name: LocalizedField;
  description?: LocalizedField | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  managerId?: string | null;
  createdBy?: string | null;
}

export interface CreateTaskData {
  projectId: string;
  title: LocalizedField;
  description?: LocalizedField | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
  estimatedHours?: number;
  parentTaskId?: string | null;
  createdBy?: string | null;
}
