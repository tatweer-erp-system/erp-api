import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryStructure } from '@/database/sql/entities/salary-structure.entity';
import { SalaryRule } from '@/database/sql/entities/salary-rule.entity';
import { Payslip } from '@/database/sql/entities/payslip.entity';
import { PayslipLine } from '@/database/sql/entities/payslip-line.entity';
import { SalaryStructuresRepository } from '@/database/sql/repositories/salary-structures.repository';
import { PayslipsRepository } from '@/database/sql/repositories/payslips.repository';
import { PayrollService } from './services/payroll.service';
import { SalaryStructuresController } from './controllers/salary-structures.controller';
import { PayslipsController } from './controllers/payslips.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SalaryStructure, SalaryRule, Payslip, PayslipLine])],
  controllers: [SalaryStructuresController, PayslipsController],
  providers: [SalaryStructuresRepository, PayslipsRepository, PayrollService],
  exports: [PayrollService, SalaryStructuresRepository],
})
export class PayrollModule {}
