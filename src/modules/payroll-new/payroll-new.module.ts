import { Module } from '@nestjs/common';
import {
  SalaryStructuresController,
  SalaryRulesController,
} from './controllers/salary-structures.controller';
import { PayslipsController } from './controllers/payslips.controller';
import { SalaryStructuresService } from './services/salary-structures.service';
import { PayslipsService } from './services/payslips.service';
import { SalaryStructuresRepository } from '@/database/sql/repositories/salary-structures.repository';
import { SalaryRulesRepository } from '@/database/sql/repositories/salary-rules.repository';
import { PayslipsRepository } from '@/database/sql/repositories/payslips.repository';
import { PayslipLinesRepository } from '@/database/sql/repositories/payslip-lines.repository';

@Module({
  controllers: [SalaryStructuresController, SalaryRulesController, PayslipsController],
  providers: [
    SalaryStructuresService,
    PayslipsService,
    SalaryStructuresRepository,
    SalaryRulesRepository,
    PayslipsRepository,
    PayslipLinesRepository,
  ],
  exports: [],
})
export class PayrollNewModule {}
