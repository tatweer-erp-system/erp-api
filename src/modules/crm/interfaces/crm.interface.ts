import { LeadStatus, LeadPriority, SalesOrderStatus, ContactType } from '@/common/enums/crm.enums';
export { LeadStatus, LeadPriority, SalesOrderStatus, ContactType };

export interface CreateContactData {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  position?: string | null;
  notes?: string | null;
  status?: string;
  assignedTo?: string | null;
  createdBy?: string | null;
}

export interface CreateLeadData {
  title: string;
  contactId?: string | null;
  value?: number | null;
  currency?: string;
  currencyId?: string | null;
  valueBase?: number | null;
  status?: LeadStatus;
  priority?: string;
  assignedTo?: string | null;
  expectedCloseDate?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface PipelineGroup {
  count: number;
  totalValue: number;
  leads: PipelineLead[];
}

export interface PipelineLead {
  id: string;
  title: string;
  contactId: string | null;
  value: number | null;
  currencyId: string | null;
  valueBase: number | null;
  priority: LeadPriority;
  assignedTo: string | null;
  expectedCloseDate: string | null;
}

export interface ConversionReport {
  winRate: number;
  wonCount: number;
  lostCount: number;
  avgDealSize: number;
  avgDaysToClose: number;
  byAssignee: AssigneeConversion[];
}

export interface AssigneeConversion {
  assignedTo: string;
  wonCount: number;
  lostCount: number;
  winRate: number;
  avgDealSize: number;
  avgDaysToClose: number;
}
