import { Module } from '@nestjs/common';
import { DepartmentsController } from './controllers/departments.controller';
import { DepartmentsService } from './services/departments.service';
import { EmployeesController } from './controllers/employees.controller';
import { EmployeesService } from './services/employees.service';
import { LeavesController } from './controllers/leaves.controller';
import { LeavesService } from './services/leaves.service';
import { HrDefinitionsController } from './controllers/hr-definitions.controller';
import { HrDefinitionsService } from './services/hr-definitions.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  controllers: [
    DepartmentsController,
    EmployeesController,
    LeavesController,
    HrDefinitionsController,
  ],
  providers: [
    DepartmentsService,
    EmployeesService,
    LeavesService,
    HrDefinitionsService,
    SequencesService,
  ],
  exports: [],
})
export class HrModule {}
