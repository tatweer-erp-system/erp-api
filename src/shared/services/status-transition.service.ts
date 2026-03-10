import { Injectable, BadRequestException } from '@nestjs/common';
import {
  StatusTransitionRule,
  StatusTransitionMap,
  TransitionResult,
} from '../interfaces/status-transition.interface';
import {
  InvoiceStatus,
  OrderStatus,
  LeaveStatus,
  ProjectStatus,
  TaskStatus,
  LeadStatus,
} from '@/common/enums/status.enum';

const TRANSITIONS: StatusTransitionMap = {
  invoice: [
    { from: InvoiceStatus.DRAFT, to: InvoiceStatus.APPROVED },
    { from: InvoiceStatus.APPROVED, to: InvoiceStatus.SENT },
    { from: InvoiceStatus.SENT, to: InvoiceStatus.PAID },
    { from: InvoiceStatus.SENT, to: InvoiceStatus.PARTIALLY_PAID },
    { from: InvoiceStatus.PARTIALLY_PAID, to: InvoiceStatus.PAID },
    { from: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID], to: InvoiceStatus.OVERDUE },
    {
      from: [InvoiceStatus.DRAFT, InvoiceStatus.APPROVED, InvoiceStatus.SENT],
      to: InvoiceStatus.CANCELLED,
    },
  ],
  order: [
    { from: OrderStatus.DRAFT, to: OrderStatus.CONFIRMED },
    { from: OrderStatus.CONFIRMED, to: OrderStatus.IN_PROGRESS },
    { from: OrderStatus.IN_PROGRESS, to: OrderStatus.SHIPPED },
    { from: OrderStatus.SHIPPED, to: OrderStatus.DELIVERED },
    {
      from: [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS],
      to: OrderStatus.CANCELLED,
    },
  ],
  leave: [
    { from: LeaveStatus.PENDING, to: LeaveStatus.APPROVED },
    { from: LeaveStatus.PENDING, to: LeaveStatus.REJECTED },
    { from: [LeaveStatus.PENDING, LeaveStatus.APPROVED], to: LeaveStatus.CANCELLED },
  ],
  project: [
    { from: ProjectStatus.PLANNING, to: ProjectStatus.ACTIVE },
    { from: ProjectStatus.ACTIVE, to: ProjectStatus.ON_HOLD },
    { from: ProjectStatus.ON_HOLD, to: ProjectStatus.ACTIVE },
    { from: [ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD], to: ProjectStatus.COMPLETED },
    {
      from: [ProjectStatus.PLANNING, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD],
      to: ProjectStatus.CANCELLED,
    },
  ],
  task: [
    { from: TaskStatus.TODO, to: TaskStatus.IN_PROGRESS },
    { from: TaskStatus.IN_PROGRESS, to: TaskStatus.IN_REVIEW },
    { from: TaskStatus.IN_REVIEW, to: TaskStatus.DONE },
    { from: TaskStatus.IN_REVIEW, to: TaskStatus.IN_PROGRESS },
    {
      from: [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW],
      to: TaskStatus.CANCELLED,
    },
  ],
  lead: [
    { from: LeadStatus.NEW, to: LeadStatus.CONTACTED },
    { from: LeadStatus.CONTACTED, to: LeadStatus.QUALIFIED },
    { from: LeadStatus.QUALIFIED, to: LeadStatus.PROPOSAL },
    { from: LeadStatus.PROPOSAL, to: LeadStatus.NEGOTIATION },
    { from: LeadStatus.NEGOTIATION, to: LeadStatus.WON },
    {
      from: [
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.PROPOSAL,
        LeadStatus.NEGOTIATION,
      ],
      to: LeadStatus.LOST,
    },
  ],
};

@Injectable()
export class StatusTransitionService {
  validate(entity: string, from: string, to: string): TransitionResult {
    const rules = TRANSITIONS[entity];
    if (!rules) {
      return { allowed: false, from, to, reason: `Unknown entity type: ${entity}` };
    }

    const allowed = rules.some((rule) => {
      const fromMatch = Array.isArray(rule.from) ? rule.from.includes(from) : rule.from === from;
      return fromMatch && rule.to === to;
    });

    return {
      allowed,
      from,
      to,
      reason: allowed
        ? undefined
        : `Transition from '${from}' to '${to}' is not allowed for ${entity}`,
    };
  }

  validateOrThrow(entity: string, from: string, to: string): void {
    const result = this.validate(entity, from, to);
    if (!result.allowed) {
      throw new BadRequestException(result.reason);
    }
  }

  getAllowedTransitions(entity: string, from: string): string[] {
    const rules = TRANSITIONS[entity];
    if (!rules) return [];

    return rules
      .filter((rule) => {
        return Array.isArray(rule.from) ? rule.from.includes(from) : rule.from === from;
      })
      .map((rule) => rule.to);
  }

  registerTransitions(entity: string, rules: StatusTransitionRule[]): void {
    TRANSITIONS[entity] = rules;
  }
}
