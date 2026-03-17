import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Payslip } from '../entities/payslip.entity';

@Injectable()
export class PayslipsRepository extends BaseRepository<Payslip> {
  constructor() {
    super(Payslip, true);
  }
}
