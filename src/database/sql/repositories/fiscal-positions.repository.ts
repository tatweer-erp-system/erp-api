import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { FiscalPosition } from '../entities/fiscal-position.entity';

@Injectable()
export class FiscalPositionsRepository extends BaseRepository<FiscalPosition> {
  constructor() {
    super(FiscalPosition, true);
  }
}
