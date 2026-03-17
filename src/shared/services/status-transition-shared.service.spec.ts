import { BadRequestException } from '@nestjs/common';
import { StatusTransitionSharedService } from './status-transition-shared.service';
import { InvoiceStatus, OrderStatus } from '@/common/enums/status.enum';
import { LeadStatus } from '@/common/enums/crm.enums';
import { LeaveStatus } from '@/common/enums/hr.enums';
import { ProjectStatus, TaskStatus } from '@/common/enums/project.enums';

describe('StatusTransitionSharedService', () => {
  let service: StatusTransitionSharedService;

  beforeEach(() => {
    service = new StatusTransitionSharedService();
  });

  // ─── validate() ───────────────────────────────────────────────────────

  describe('validate()', () => {
    // Invoice transitions
    it('should allow invoice: draft -> approved', () => {
      const result = service.validate('invoice', InvoiceStatus.DRAFT, InvoiceStatus.APPROVED);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow invoice: approved -> sent', () => {
      const result = service.validate('invoice', InvoiceStatus.APPROVED, InvoiceStatus.SENT);
      expect(result.allowed).toBe(true);
    });

    it('should allow invoice: sent -> paid', () => {
      const result = service.validate('invoice', InvoiceStatus.SENT, InvoiceStatus.PAID);
      expect(result.allowed).toBe(true);
    });

    it('should allow invoice: sent -> partially_paid', () => {
      const result = service.validate('invoice', InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID);
      expect(result.allowed).toBe(true);
    });

    it('should allow invoice: partially_paid -> paid', () => {
      const result = service.validate('invoice', InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID);
      expect(result.allowed).toBe(true);
    });

    it('should allow invoice: sent -> overdue', () => {
      const result = service.validate('invoice', InvoiceStatus.SENT, InvoiceStatus.OVERDUE);
      expect(result.allowed).toBe(true);
    });

    it('should allow invoice: partially_paid -> overdue', () => {
      const result = service.validate(
        'invoice',
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.OVERDUE,
      );
      expect(result.allowed).toBe(true);
    });

    it('should allow invoice: draft -> cancelled', () => {
      const result = service.validate('invoice', InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED);
      expect(result.allowed).toBe(true);
    });

    it('should reject invoice: paid -> draft (backward transition)', () => {
      const result = service.validate('invoice', InvoiceStatus.PAID, InvoiceStatus.DRAFT);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('should reject invoice: cancelled -> approved', () => {
      const result = service.validate('invoice', InvoiceStatus.CANCELLED, InvoiceStatus.APPROVED);
      expect(result.allowed).toBe(false);
    });

    it('should reject invoice: paid -> cancelled', () => {
      const result = service.validate('invoice', InvoiceStatus.PAID, InvoiceStatus.CANCELLED);
      expect(result.allowed).toBe(false);
    });

    // Order transitions
    it('should allow order: draft -> confirmed', () => {
      const result = service.validate('order', OrderStatus.DRAFT, OrderStatus.CONFIRMED);
      expect(result.allowed).toBe(true);
    });

    it('should allow order: confirmed -> in_progress', () => {
      const result = service.validate('order', OrderStatus.CONFIRMED, OrderStatus.IN_PROGRESS);
      expect(result.allowed).toBe(true);
    });

    it('should allow order: in_progress -> shipped', () => {
      const result = service.validate('order', OrderStatus.IN_PROGRESS, OrderStatus.SHIPPED);
      expect(result.allowed).toBe(true);
    });

    it('should allow order: shipped -> delivered', () => {
      const result = service.validate('order', OrderStatus.SHIPPED, OrderStatus.DELIVERED);
      expect(result.allowed).toBe(true);
    });

    it('should allow order: draft -> cancelled', () => {
      const result = service.validate('order', OrderStatus.DRAFT, OrderStatus.CANCELLED);
      expect(result.allowed).toBe(true);
    });

    it('should reject order: delivered -> cancelled', () => {
      const result = service.validate('order', OrderStatus.DELIVERED, OrderStatus.CANCELLED);
      expect(result.allowed).toBe(false);
    });

    it('should reject order: shipped -> confirmed (backward)', () => {
      const result = service.validate('order', OrderStatus.SHIPPED, OrderStatus.CONFIRMED);
      expect(result.allowed).toBe(false);
    });

    // Leave transitions
    it('should allow leave: pending -> approved', () => {
      const result = service.validate('leave', LeaveStatus.PENDING, LeaveStatus.APPROVED);
      expect(result.allowed).toBe(true);
    });

    it('should allow leave: pending -> rejected', () => {
      const result = service.validate('leave', LeaveStatus.PENDING, LeaveStatus.REJECTED);
      expect(result.allowed).toBe(true);
    });

    it('should allow leave: approved -> cancelled', () => {
      const result = service.validate('leave', LeaveStatus.APPROVED, LeaveStatus.CANCELLED);
      expect(result.allowed).toBe(true);
    });

    it('should reject leave: rejected -> approved', () => {
      const result = service.validate('leave', LeaveStatus.REJECTED, LeaveStatus.APPROVED);
      expect(result.allowed).toBe(false);
    });

    // Project transitions
    it('should allow project: planning -> active', () => {
      const result = service.validate('project', ProjectStatus.PLANNING, ProjectStatus.ACTIVE);
      expect(result.allowed).toBe(true);
    });

    it('should allow project: active <-> on_hold (bidirectional)', () => {
      expect(service.validate('project', ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD).allowed).toBe(
        true,
      );
      expect(service.validate('project', ProjectStatus.ON_HOLD, ProjectStatus.ACTIVE).allowed).toBe(
        true,
      );
    });

    it('should allow project: active -> completed', () => {
      const result = service.validate('project', ProjectStatus.ACTIVE, ProjectStatus.COMPLETED);
      expect(result.allowed).toBe(true);
    });

    it('should reject project: completed -> active', () => {
      const result = service.validate('project', ProjectStatus.COMPLETED, ProjectStatus.ACTIVE);
      expect(result.allowed).toBe(false);
    });

    // Task transitions
    it('should allow task: todo -> in_progress', () => {
      const result = service.validate('task', TaskStatus.TODO, TaskStatus.IN_PROGRESS);
      expect(result.allowed).toBe(true);
    });

    it('should allow task: in_review -> in_progress (send back)', () => {
      const result = service.validate('task', TaskStatus.IN_REVIEW, TaskStatus.IN_PROGRESS);
      expect(result.allowed).toBe(true);
    });

    it('should allow task: in_review -> done', () => {
      const result = service.validate('task', TaskStatus.IN_REVIEW, TaskStatus.DONE);
      expect(result.allowed).toBe(true);
    });

    it('should reject task: done -> todo', () => {
      const result = service.validate('task', TaskStatus.DONE, TaskStatus.TODO);
      expect(result.allowed).toBe(false);
    });

    // Lead transitions
    it('should allow lead: new -> qualified', () => {
      const result = service.validate('lead', LeadStatus.NEW, LeadStatus.QUALIFIED);
      expect(result.allowed).toBe(true);
    });

    it('should allow lead: proposition -> won', () => {
      const result = service.validate('lead', LeadStatus.PROPOSITION, LeadStatus.WON);
      expect(result.allowed).toBe(true);
    });

    it('should allow lead: new -> lost', () => {
      const result = service.validate('lead', LeadStatus.NEW, LeadStatus.LOST);
      expect(result.allowed).toBe(true);
    });

    it('should reject lead: won -> new', () => {
      const result = service.validate('lead', LeadStatus.WON, LeadStatus.NEW);
      expect(result.allowed).toBe(false);
    });

    // Unknown entity
    it('should return not allowed for unknown entity type', () => {
      const result = service.validate('nonexistent', 'a', 'b');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Unknown entity type');
    });
  });

  // ─── validateOrThrow() ────────────────────────────────────────────────

  describe('validateOrThrow()', () => {
    it('should not throw for valid transition', () => {
      expect(() =>
        service.validateOrThrow('invoice', InvoiceStatus.DRAFT, InvoiceStatus.APPROVED),
      ).not.toThrow();
    });

    it('should throw BadRequestException for invalid transition', () => {
      expect(() =>
        service.validateOrThrow('invoice', InvoiceStatus.PAID, InvoiceStatus.DRAFT),
      ).toThrow(BadRequestException);
    });
  });

  // ─── getAllowedTransitions() ──────────────────────────────────────────

  describe('getAllowedTransitions()', () => {
    it('should return all valid next states for a given state', () => {
      const allowed = service.getAllowedTransitions('invoice', InvoiceStatus.SENT);
      expect(allowed).toContain(InvoiceStatus.PAID);
      expect(allowed).toContain(InvoiceStatus.PARTIALLY_PAID);
      expect(allowed).toContain(InvoiceStatus.OVERDUE);
      expect(allowed).toContain(InvoiceStatus.CANCELLED);
    });

    it('should return empty array for terminal state', () => {
      const allowed = service.getAllowedTransitions('invoice', InvoiceStatus.PAID);
      expect(allowed).toEqual([]);
    });

    it('should return empty array for unknown entity', () => {
      const allowed = service.getAllowedTransitions('nonexistent', 'a');
      expect(allowed).toEqual([]);
    });

    it('should return correct transitions for order draft', () => {
      const allowed = service.getAllowedTransitions('order', OrderStatus.DRAFT);
      expect(allowed).toContain(OrderStatus.CONFIRMED);
      expect(allowed).toContain(OrderStatus.CANCELLED);
      expect(allowed).not.toContain(OrderStatus.SHIPPED);
    });
  });

  // ─── registerTransitions() ────────────────────────────────────────────

  describe('registerTransitions()', () => {
    it('should register custom transitions for a new entity type', () => {
      service.registerTransitions('custom', [
        { from: 'open', to: 'closed' },
        { from: 'open', to: 'cancelled' },
      ]);

      expect(service.validate('custom', 'open', 'closed').allowed).toBe(true);
      expect(service.validate('custom', 'closed', 'open').allowed).toBe(false);
    });

    it('should keep other entity transitions intact when registering new ones', () => {
      service.registerTransitions('custom', [{ from: 'a', to: 'b' }]);

      // Invoice transitions should still work
      expect(service.validate('invoice', InvoiceStatus.DRAFT, InvoiceStatus.APPROVED).allowed).toBe(
        true,
      );
    });

    it('should support array-based from in custom transitions', () => {
      service.registerTransitions('workflow', [{ from: ['step1', 'step2'], to: 'step3' }]);

      expect(service.validate('workflow', 'step1', 'step3').allowed).toBe(true);
      expect(service.validate('workflow', 'step2', 'step3').allowed).toBe(true);
      expect(service.validate('workflow', 'step3', 'step1').allowed).toBe(false);
    });

    it('should override existing transitions for same entity', () => {
      // NOTE: this mutates the shared TRANSITIONS map so it must run last
      service.registerTransitions('invoice', [{ from: 'x', to: 'y' }]);

      // Original transitions should be gone
      expect(service.validate('invoice', InvoiceStatus.DRAFT, InvoiceStatus.APPROVED).allowed).toBe(
        false,
      );
      // New transition should work
      expect(service.validate('invoice', 'x', 'y').allowed).toBe(true);
    });
  });
});
