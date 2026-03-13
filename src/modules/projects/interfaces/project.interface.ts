import { ProjectStatus, TaskStatus, TaskPriority } from '@/common/enums/project.enums';
export { ProjectStatus, TaskStatus, TaskPriority };

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
