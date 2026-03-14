import { Module } from '@nestjs/common';
import { AdminTicketsController } from './controllers/tickets.controller';
import { SupportTicketsController } from './controllers/support-tickets.controller';
import { TicketsService } from './services/tickets.service';
import { TicketsRepository } from '@/database/sql/repositories/tickets.repository';
import { TicketRepliesRepository } from '@/database/sql/repositories/ticket-replies.repository';

@Module({
  imports: [],
  controllers: [AdminTicketsController, SupportTicketsController],
  providers: [TicketsService, TicketsRepository, TicketRepliesRepository],
  exports: [],
})
export class TicketsModule {}
