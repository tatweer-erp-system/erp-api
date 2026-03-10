import { Module } from '@nestjs/common';
import { DepartmentsController } from './controllers/departments.controller';
import { DepartmentsService } from './services/departments.service';
import { DepartmentsRepository } from '../../database/repositories/departments.repository';
import { EmployeesController } from './controllers/employees.controller';
import { EmployeesService } from './services/employees.service';
import { EmployeesRepository } from '../../database/repositories/employees.repository';
import { LeavesController } from './controllers/leaves.controller';
import { LeavesService } from './services/leaves.service';
import { LeavesRepository } from '../../database/repositories/leaves.repository';

@Module({
  controllers: [DepartmentsController, EmployeesController, LeavesController],
  providers: [
    DepartmentsService,
    DepartmentsRepository,
    EmployeesService,
    EmployeesRepository,
    LeavesService,
    LeavesRepository,
  ],
  exports: [DepartmentsService, EmployeesService, LeavesService],
})
export class HrModule {}
