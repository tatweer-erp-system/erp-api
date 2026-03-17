import { LeadType, LeadPriority, LeadSource } from '@/common/enums/crm.enums';
export { LeadType, LeadPriority, LeadSource };

export interface CreateLeadData {
  title: string;
  stageId?: string | null;
  partnerId?: string | null;
  type?: LeadType;
  probability?: number | null;
  expectedRevenue?: number | null;
  currencyId?: string | null;
  expectedRevenueBase?: number | null;
  priority?: LeadPriority;
  assignedTo?: string | null;
  expectedCloseDate?: string | null;
  source?: LeadSource | null;
  campaign?: string | null;
  medium?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface PipelineStage {
  stageId: string;
  nameEn: string;
  nameAr: string;
  sequence: number;
  stageProbability: number;
  isWon: boolean;
  isFolded: boolean;
  count: number;
  totalValue: number;
  leads: PipelineLead[];
}

export interface PipelineLead {
  id: string;
  title: string;
  partnerId: string | null;
  partnerNameEn: string | null;
  partnerNameAr: string | null;
  expectedRevenue: number | null;
  currencyId: string | null;
  expectedRevenueBase: number | null;
  priority: LeadPriority;
  assignedTo: string | null;
  expectedCloseDate: string | null;
  stageId: string | null;
  type: LeadType;
  probability: number | null;
  isWon: boolean;
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
