import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosSession } from '@/database/sql/entities/pos-session.entity';
import { PosTerminal } from '@/database/sql/entities/pos-terminal.entity';
import { ManagerOverride } from '@/database/sql/entities/manager-override.entity';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { PosTerminalsRepository } from '@/database/sql/repositories/pos-terminals.repository';
import { ManagerOverridesRepository } from '@/database/sql/repositories/manager-overrides.repository';
import { TerminalsController } from './controllers/terminals.controller';
import { SessionsController } from './controllers/sessions.controller';
import { TerminalsService } from './services/terminals.service';
import { PosSessionsService } from './services/sessions.service';

@Module({
  imports: [TypeOrmModule.forFeature([PosSession, PosTerminal, ManagerOverride])],
  controllers: [TerminalsController, SessionsController],
  providers: [
    PosSessionsRepository,
    PosTerminalsRepository,
    ManagerOverridesRepository,
    TerminalsService,
    PosSessionsService,
  ],
  exports: [PosSessionsRepository, PosTerminalsRepository, ManagerOverridesRepository],
})
export class PosSessionsModule {}
