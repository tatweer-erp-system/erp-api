import { Module } from '@nestjs/common';
import { AccountingModule } from '@/modules/accounting/accounting.module';
import { ShiftsController } from './controllers/shifts.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { PayrollController } from './controllers/payroll.controller';
import { TrainingController } from './controllers/training.controller';
import { ContractsController } from './controllers/contracts.controller';
import { ShiftsService } from './services/shifts.service';
import { AttendanceService } from './services/attendance.service';
import { PayrollService } from './services/payroll.service';
import { TrainingService } from './services/training.service';
import { ContractsService } from './services/contracts.service';

@Module({
  imports: [AccountingModule],
  controllers: [
    ShiftsController,
    AttendanceController,
    PayrollController,
    TrainingController,
    ContractsController,
  ],
  providers: [ShiftsService, AttendanceService, PayrollService, TrainingService, ContractsService],
  exports: [PayrollService],
})
export class HrExtensionsModule {}
