import { ActivityType } from '@/common/enums/activity.enums';

export interface CreateActivityData {
  model: string;
  recordId: string;
  recordName?: string | null;
  activityType: ActivityType;
  icon?: string | null;
  summary: string;
  note?: string | null;
  scheduledDate: string;
  assignedTo: string;
}

export interface UpdateActivityData {
  model?: string;
  recordId?: string;
  recordName?: string | null;
  activityType?: ActivityType;
  icon?: string | null;
  summary?: string;
  note?: string | null;
  scheduledDate?: string;
  assignedTo?: string;
}

export interface MarkDoneData {
  feedbackNote?: string | null;
}

export interface ActivityFilter {
  model?: string;
  recordId?: string;
  assignedTo?: string;
  isDone?: boolean;
  dueBefore?: string;
  dueAfter?: string;
  activityType?: ActivityType;
}
