import { Injectable, Logger } from '@nestjs/common';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { NotificationsRepository } from '@/database/sql/repositories/notifications.repository';
import { NotificationPreferencesRepository } from '@/database/sql/repositories/notification-preferences.repository';
import { OutboxSharedService } from '@/shared/services/outbox-shared.service';
import { IEventHandler, OutboxEventPayload } from './event-handler.interface';
import { LeaveStatus } from '@/common/enums/hr.enums';
import { NotificationChannel } from '@/common/enums/notification.enums';

@Injectable()
export class LeaveRequestEventHandler implements IEventHandler {
  private readonly logger = new Logger(LeaveRequestEventHandler.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly employeesRepository: EmployeesRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly notificationPreferencesRepository: NotificationPreferencesRepository,
    private readonly outboxService: OutboxSharedService,
  ) {}

  async handle(event: OutboxEventPayload): Promise<void> {
    const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;

    switch (event.eventType) {
      case 'leave_request.created':
        await this.handleCreated(event.tenantId, payload);
        break;
      case 'leave_request.status_changed':
        await this.handleStatusChanged(event.tenantId, payload);
        break;
      default:
        this.logger.warn(`Unhandled leave request event type: ${event.eventType}`);
    }
  }

  private async handleCreated(tenantId: string, payload: Record<string, unknown>): Promise<void> {
    const employeeId = payload.employeeId as string;
    const leaveRequestId = payload.leaveRequestId as string;
    const leaveType = payload.leaveType as string;
    const startDate = payload.startDate as string;
    const endDate = payload.endDate as string;

    // Find employee to get managerId
    const employee = await this.employeesRepository.findOneById(tenantId, employeeId);
    if (!employee) {
      this.logger.warn(`Employee ${employeeId} not found for leave request notification`);
      return;
    }

    const managerId = employee.managerId;
    if (!managerId) {
      this.logger.warn(`Employee ${employeeId} has no manager set, skipping notification`);
      return;
    }

    // Find manager to get userId
    const manager = await this.employeesRepository.findOneById(tenantId, managerId);
    if (!manager) {
      this.logger.warn(`Manager ${managerId} not found for leave request notification`);
      return;
    }

    const managerUserId = manager.userId;

    // Create in-app notification for manager
    await this.notificationsRepository.create(tenantId, {
      userId: managerUserId,
      type: 'leave_request.pending',
      title: 'New Leave Request',
      body: `An employee has submitted a ${leaveType} leave request from ${startDate} to ${endDate}`,
      data: {
        leaveRequestId,
        employeeId,
        leaveType,
        startDate,
        endDate,
      },
    });

    // Check if manager has email notifications enabled
    const emailEnabled = await this.notificationPreferencesRepository.isChannelEnabled(
      tenantId,
      managerUserId,
      'leave_request.pending',
      NotificationChannel.EMAIL,
    );

    if (emailEnabled) {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      const transaction = await sequelize.transaction();
      try {
        await this.outboxService.createEvent({
          tenantId,
          eventType: 'SEND_EMAIL',
          payload: {
            to: managerUserId,
            template: 'leave_request_pending',
            data: {
              leaveRequestId,
              employeeId,
              leaveType,
              startDate,
              endDate,
            },
          },
          transaction,
        });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        this.logger.error(`Failed to create email outbox event for leave request: ${error}`);
      }
    }

    this.logger.log(
      `Leave request ${leaveRequestId} notification sent to manager ${managerUserId}`,
    );
  }

  private async handleStatusChanged(
    tenantId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const employeeId = payload.employeeId as string;
    const leaveRequestId = payload.leaveRequestId as string;
    const newStatus = payload.newStatus as string;

    // Find employee to get userId
    const employee = await this.employeesRepository.findOneById(tenantId, employeeId);
    if (!employee) {
      this.logger.warn(`Employee ${employeeId} not found for leave request status notification`);
      return;
    }

    const employeeUserId = employee.userId;
    const notificationType =
      newStatus === LeaveStatus.APPROVED ? 'leave_request.approved' : 'leave_request.rejected';

    const title =
      newStatus === LeaveStatus.APPROVED ? 'Leave Request Approved' : 'Leave Request Rejected';
    const body =
      newStatus === LeaveStatus.APPROVED
        ? 'Your leave request has been approved'
        : `Your leave request has been rejected${payload.rejectionReason ? `: ${payload.rejectionReason}` : ''}`;

    // Create in-app notification for employee
    await this.notificationsRepository.create(tenantId, {
      userId: employeeUserId,
      type: notificationType,
      title,
      body,
      data: {
        leaveRequestId,
        status: newStatus,
        rejectionReason: (payload.rejectionReason as string) ?? null,
      },
    });

    this.logger.log(
      `Leave request ${leaveRequestId} status changed to ${newStatus}, employee ${employeeUserId} notified`,
    );
  }
}
