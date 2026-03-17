import { Module } from '@nestjs/common';
import { LeaveTypesController } from './controllers/leave-types.controller';
import { LeaveAllocationsController } from './controllers/leave-allocations.controller';
import { JobPositionsController } from './controllers/job-positions.controller';
import { LeaveTypesService } from './services/leave-types.service';
import { LeaveAllocationsService } from './services/leave-allocations.service';
import { JobPositionsService } from './services/job-positions.service';
import { ShiftWorkingDaysService } from './services/shift-working-days.service';
import { LeaveTypesRepository } from '@/database/sql/repositories/leave-types.repository';
import { LeaveAllocationsRepository } from '@/database/sql/repositories/leave-allocations.repository';
import { JobPositionsRepository } from '@/database/sql/repositories/job-positions.repository';
import { ShiftWorkingDaysRepository } from '@/database/sql/repositories/shift-working-days.repository';

@Module({
  controllers: [LeaveTypesController, LeaveAllocationsController, JobPositionsController],
  providers: [
    LeaveTypesService,
    LeaveAllocationsService,
    JobPositionsService,
    ShiftWorkingDaysService,
    LeaveTypesRepository,
    LeaveAllocationsRepository,
    JobPositionsRepository,
    ShiftWorkingDaysRepository,
  ],
  exports: [ShiftWorkingDaysService],
})
export class HrSetupModule {}
