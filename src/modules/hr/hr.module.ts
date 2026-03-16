import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentsController } from './controllers/departments.controller';
import { DepartmentsService } from './services/departments.service';
import { EmployeesController } from './controllers/employees.controller';
import { EmployeesService } from './services/employees.service';
import { LeavesController } from './controllers/leaves.controller';
import { LeavesService } from './services/leaves.service';
import { HrDefinitionsController } from './controllers/hr-definitions.controller';
import { HrDefinitionsService } from './services/hr-definitions.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

// New TypeORM-based controllers
import { EmployeesV2Controller } from './controllers/employees-v2.controller';
import { DepartmentsV2Controller } from './controllers/departments-v2.controller';
import { LeaveTypesController } from './controllers/leave-types.controller';
import { LeaveRequestsController } from './controllers/leave-requests.controller';
import { LeaveAllocationsController } from './controllers/leave-allocations.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { EmployeeContractsController } from './controllers/employee-contracts.controller';

// New TypeORM-based service
import { HrService } from './services/hr.service';

// TypeORM repositories
import { EmployeesRepository } from '@/database/sql/repositories/employees.repository';
import { DepartmentsRepository } from '@/database/sql/repositories/departments.repository';
import { EmployeeContractsRepository } from '@/database/sql/repositories/employee-contracts.repository';
import { LeaveTypesRepository } from '@/database/sql/repositories/leave-types.repository';
import { LeaveRequestsRepository } from '@/database/sql/repositories/leave-requests.repository';
import { LeaveAllocationsRepository } from '@/database/sql/repositories/leave-allocations.repository';
import { AttendanceRecordsRepository } from '@/database/sql/repositories/attendance-records.repository';

// Entities
import { Employee } from '@/database/sql/entities/employee.entity';
import { Department } from '@/database/sql/entities/department.entity';
import { EmployeeContract } from '@/database/sql/entities/employee-contract.entity';
import { LeaveType } from '@/database/sql/entities/leave-type.entity';
import { LeaveRequest } from '@/database/sql/entities/leave-request.entity';
import { LeaveAllocation } from '@/database/sql/entities/leave-allocation.entity';
import { AttendanceRecord } from '@/database/sql/entities/attendance-record.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Department,
      EmployeeContract,
      LeaveType,
      LeaveRequest,
      LeaveAllocation,
      AttendanceRecord,
    ]),
  ],
  controllers: [
    DepartmentsController,
    EmployeesController,
    LeavesController,
    HrDefinitionsController,
    EmployeesV2Controller,
    DepartmentsV2Controller,
    LeaveTypesController,
    LeaveRequestsController,
    LeaveAllocationsController,
    AttendanceController,
    EmployeeContractsController,
  ],
  providers: [
    DepartmentsService,
    EmployeesService,
    LeavesService,
    HrDefinitionsService,
    SequencesService,
    HrService,
    EmployeesRepository,
    DepartmentsRepository,
    EmployeeContractsRepository,
    LeaveTypesRepository,
    LeaveRequestsRepository,
    LeaveAllocationsRepository,
    AttendanceRecordsRepository,
  ],
  exports: [HrService, EmployeesRepository],
})
export class HrModule {}
