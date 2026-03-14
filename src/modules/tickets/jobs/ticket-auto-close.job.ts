import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { v7 as uuidv7 } from 'uuid';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { TicketsRepository } from '@/database/sql/repositories/tickets.repository';
import { TicketRepliesRepository } from '@/database/sql/repositories/ticket-replies.repository';
import { TicketStatus, TicketReplySender } from '@/common/enums/ticket.enums';
import { TenantStatus } from '@/common/enums/tenant.enums';

const INACTIVITY_DAYS = 7;
const AUTO_CLOSE_MESSAGE = 'This ticket was automatically closed after 7 days of inactivity.';

@Injectable()
export class TicketAutoCloseJob {
  private readonly logger = new Logger(TicketAutoCloseJob.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly ticketsRepository: TicketsRepository,
    private readonly ticketRepliesRepository: TicketRepliesRepository,
  ) {}

  /**
   * Runs daily at 02:00 UTC.
   * Finds RESOLVED tickets with no reply in the last 7 days and closes them.
   * Adds a SYSTEM reply indicating automatic closure.
   */
  @Cron('0 0 2 * * *')
  async handleTicketAutoClose(): Promise<void> {
    this.logger.log('Starting ticket auto-close job...');

    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    const [tenants] = await sharedSequelize.query(
      `SELECT id FROM tenants WHERE status IN (:active, :trial) AND "deletedAt" IS NULL ORDER BY id ASC`,
      { replacements: { active: TenantStatus.ACTIVE, trial: TenantStatus.TRIAL } },
    );

    const tenantList = tenants as { id: string }[];
    let totalClosed = 0;

    for (const tenant of tenantList) {
      try {
        const closed = await this.processTicketsForTenant(tenant.id);
        totalClosed += closed;
      } catch (err) {
        this.logger.error(
          `Failed to process ticket auto-close for tenant ${tenant.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    this.logger.log(
      `Ticket auto-close job completed: ${totalClosed} ticket(s) closed across ${tenantList.length} tenant(s)`,
    );
  }

  private async processTicketsForTenant(tenantId: string): Promise<number> {
    const staleTickets = await this.ticketsRepository.rawQuery<{ id: string }[]>(
      `SELECT t.id
       FROM tickets t
       WHERE t."tenantId" = :tenantId
         AND t.status = :resolvedStatus
         AND t."deletedAt" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM ticket_replies tr
           WHERE tr."ticketId" = t.id
             AND tr."createdAt" > (CURRENT_TIMESTAMP - INTERVAL '${INACTIVITY_DAYS} days')
         )`,
      { tenantId, resolvedStatus: TicketStatus.RESOLVED },
    );

    if (staleTickets.length === 0) return 0;

    for (const ticket of staleTickets) {
      const sequelize = this.ticketsRepository.getSequelize();
      const transaction = await sequelize.transaction();

      try {
        await this.ticketsRepository.update(ticket.id, { status: TicketStatus.CLOSED } as any, {
          tenantId,
          transaction,
        });

        // Use rawQuery to insert system reply because the DB ENUM column
        // may not yet include 'system'. This safely inserts regardless.
        await sequelize.query(
          `INSERT INTO ticket_replies (id, "ticketId", "tenantId", "userId", "userName", "senderType", message, "createdAt", "updatedAt")
           VALUES (:id, :ticketId, :tenantId, NULL, 'System', :senderType, :message, NOW(), NOW())`,
          {
            replacements: {
              id: uuidv7(),
              ticketId: ticket.id,
              tenantId,
              senderType: TicketReplySender.SYSTEM,
              message: AUTO_CLOSE_MESSAGE,
            },
            transaction,
          },
        );

        await transaction.commit();

        this.logger.debug(`Ticket ${ticket.id} auto-closed in tenant ${tenantId}`);
      } catch (err) {
        await transaction.rollback();
        this.logger.warn(
          `Failed to auto-close ticket ${ticket.id} in tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return staleTickets.length;
  }
}
