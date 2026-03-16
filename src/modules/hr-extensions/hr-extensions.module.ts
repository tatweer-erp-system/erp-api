import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobTitle } from '@/database/sql/entities/job-title.entity';
import { EmploymentType } from '@/database/sql/entities/employment-type.entity';
import { TrainingRecord } from '@/database/sql/entities/training-record.entity';
import { PublicHoliday } from '@/database/sql/entities/public-holiday.entity';
import { AttendanceRecord } from '@/database/sql/entities/attendance-record.entity';
import { EmployeeContract } from '@/database/sql/entities/employee-contract.entity';
import { Employee } from '@/database/sql/entities/employee.entity';
import { JobTitlesRepository } from '@/database/sql/repositories/job-titles.repository';
import { EmploymentTypesRepository } from '@/database/sql/repositories/employment-types.repository';
import { TrainingRecordsRepository } from '@/database/sql/repositories/training-records.repository';
import { PublicHolidaysRepository } from '@/database/sql/repositories/public-holidays.repository';
import { AttendanceRecordsRepository } from '@/database/sql/repositories/attendance-records.repository';
import { EmployeeContractsRepository } from '@/database/sql/repositories/employee-contracts.repository';
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { ShiftsRepository } from '@/database/sql/repositories/shifts.repository';
import { PayrollRunsRepository } from '@/database/sql/repositories/payroll-runs.repository';
import { PayrollItemsRepository } from '@/database/sql/repositories/payroll-items.repository';
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
import { ContractExpiryJob } from './jobs/contract-expiry.job';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobTitle,
      EmploymentType,
      TrainingRecord,
      PublicHoliday,
      AttendanceRecord,
      EmployeeContract,
      Employee,
    ]),
  ],
  controllers: [
    ShiftsController,
    AttendanceController,
    PayrollController,
    TrainingController,
    ContractsController,
  ],
  providers: [
    JobTitlesRepository,
    EmploymentTypesRepository,
    TrainingRecordsRepository,
    PublicHolidaysRepository,
    AttendanceRecordsRepository,
    EmployeeContractsRepository,
    EmployeesRepository,
    ShiftsRepository,
    PayrollRunsRepository,
    PayrollItemsRepository,
    ShiftsService,
    AttendanceService,
    PayrollService,
    TrainingService,
    ContractsService,
    ContractExpiryJob,
  ],
  exports: [
    JobTitlesRepository,
    EmploymentTypesRepository,
    TrainingRecordsRepository,
    PublicHolidaysRepository,
  ],
})
export class HrExtensionsModule {}
