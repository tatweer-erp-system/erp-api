import { Module } from '@nestjs/common';
import { TerminalsController } from './controllers/terminals.controller';
import { SessionsController } from './controllers/sessions.controller';
import { TerminalsService } from './services/terminals.service';
import { PosSessionsService } from './services/sessions.service';

@Module({
  controllers: [TerminalsController, SessionsController],
  providers: [TerminalsService, PosSessionsService],
  exports: [PosSessionsService],
})
export class PosSessionsModule {}
