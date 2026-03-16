import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { TicketsRepository } from '@/database/sql/repositories/tickets.repository';
import { TicketRepliesRepository } from '@/database/sql/repositories/ticket-replies.repository';
import { Ticket } from '@/database/sql/entities/ticket.entity';
import { TicketReply } from '@/database/sql/entities/ticket-reply.entity';
import { TicketStatus, TicketReplySender } from '@/common/enums/ticket.enums';
import { TenantStatus } from '@/common/enums/tenant.enums';

const INACTIVITY_DAYS = 7;
const AUTO_CLOSE_MESSAGE = 'This ticket was automatically closed after 7 days of inactivity.';

@Injectable()
export class TicketAutoCloseJob {
  private readonly logger = new Logger(TicketAutoCloseJob.name);

  constructor(
    private readonly dataSource: DataSource,
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

    const tenants = (await this.dataSource.query(
      `SELECT id FROM tenants WHERE status IN ($1, $2) AND deleted_at IS NULL ORDER BY id ASC`,
      [TenantStatus.ACTIVE, TenantStatus.TRIAL],
    )) as { id: string }[];

    let totalClosed = 0;

    for (const tenant of tenants) {
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
      `Ticket auto-close job completed: ${totalClosed} ticket(s) closed across ${tenants.length} tenant(s)`,
    );
  }

  private async processTicketsForTenant(tenantId: string): Promise<number> {
    const staleTickets = (await this.dataSource.query(
      `SELECT t.id
       FROM tickets t
       WHERE t.tenant_id = $1
         AND t.status = $2
         AND t.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM ticket_replies tr
           WHERE tr.ticket_id = t.id
             AND tr.created_at > (CURRENT_TIMESTAMP - INTERVAL '${INACTIVITY_DAYS} days')
         )`,
      [tenantId, TicketStatus.RESOLVED],
    )) as { id: string }[];

    if (staleTickets.length === 0) return 0;

    for (const ticket of staleTickets) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await queryRunner.manager.update(Ticket, ticket.id, {
          status: TicketStatus.CLOSED,
          closedAt: new Date(),
        });

        const replyEntity = queryRunner.manager.create(TicketReply, {
          ticketId: ticket.id,
          userId: null,
          userName: 'System',
          senderType: TicketReplySender.SYSTEM,
          message: AUTO_CLOSE_MESSAGE,
          isInternal: false,
          createdBy: null,
        });
        await queryRunner.manager.save(TicketReply, replyEntity);

        await queryRunner.commitTransaction();

        this.logger.debug(`Ticket ${ticket.id} auto-closed in tenant ${tenantId}`);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.logger.warn(
          `Failed to auto-close ticket ${ticket.id} in tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        await queryRunner.release();
      }
    }

    return staleTickets.length;
  }
}
