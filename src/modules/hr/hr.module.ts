import { Module } from '@nestjs/common';
import { DepartmentsController } from './controllers/departments.controller';
import { DepartmentsService } from './services/departments.service';
import { EmployeesController } from './controllers/employees.controller';
import { EmployeesService } from './services/employees.service';
import { LeavesController } from './controllers/leaves.controller';
import { LeavesService } from './services/leaves.service';
import { SequencesModule } from '@/modules/sequences/sequences.module';

@Module({
  imports: [SequencesModule],
  controllers: [DepartmentsController, EmployeesController, LeavesController],
  providers: [DepartmentsService, EmployeesService, LeavesService],
  exports: [DepartmentsService, EmployeesService, LeavesService],
})
export class HrModule {}
