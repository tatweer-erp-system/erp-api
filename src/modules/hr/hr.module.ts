import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { DepartmentsRepository } from './departments/departments.repository';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { EmployeesRepository } from './employees/employees.repository';
import { LeavesController } from './leaves/leaves.controller';
import { LeavesService } from './leaves/leaves.service';
import { LeavesRepository } from './leaves/leaves.repository';

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
