import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { CashMovement } from '../entities/cash-movement.entity';

@Injectable()
export class CashMovementsRepository extends BaseRepository<CashMovement> {
  constructor() {
    super(CashMovement, true);
  }
}
