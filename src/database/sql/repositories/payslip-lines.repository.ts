import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PayslipLine } from '../entities/payslip-line.entity';

@Injectable()
export class PayslipLinesRepository extends BaseRepository<PayslipLine> {
  constructor() {
    super(PayslipLine, true);
  }
}
