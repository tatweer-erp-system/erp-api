import {
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  ProjectMemberRole,
} from '@/common/enums/project.enums';
export { ProjectStatus, TaskStatus, TaskPriority, ProjectMemberRole };

export interface CreateProjectData {
  nameEn: string;
  nameAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  managerId?: string | null;
  createdBy?: string | null;
}

export interface CreateTaskData {
  projectId: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string | null;
  dueDate?: string | null;
  estimatedHours?: number;
  parentTaskId?: string | null;
  createdBy?: string | null;
}
