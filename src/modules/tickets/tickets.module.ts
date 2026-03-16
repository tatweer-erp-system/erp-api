import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from '@/database/sql/entities/ticket.entity';
import { TicketReply } from '@/database/sql/entities/ticket-reply.entity';
import { AdminTicketsController } from './controllers/tickets.controller';
import { SupportTicketsController } from './controllers/support-tickets.controller';
import { TicketsService } from './services/tickets.service';
import { TicketsRepository } from '@/database/sql/repositories/tickets.repository';
import { TicketRepliesRepository } from '@/database/sql/repositories/ticket-replies.repository';
import { TicketAutoCloseJob } from './jobs/ticket-auto-close.job';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketReply])],
  controllers: [AdminTicketsController, SupportTicketsController],
  providers: [TicketsService, TicketsRepository, TicketRepliesRepository, TicketAutoCloseJob],
  exports: [TicketsRepository],
})
export class TicketsModule {}
