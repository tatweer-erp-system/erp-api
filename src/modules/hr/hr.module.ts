import { Module } from '@nestjs/common';
import { EmployeesController } from './employees/employees.controller';
import { EmployeesService } from './employees/employees.service';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { LeavesController } from './leaves/leaves.controller';
import { LeavesService } from './leaves/leaves.service';

@Module({
  controllers: [EmployeesController, DepartmentsController, LeavesController],
  providers: [EmployeesService, DepartmentsService, LeavesService],
  exports: [EmployeesService, DepartmentsService, LeavesService],
})
export class HrModule {}
