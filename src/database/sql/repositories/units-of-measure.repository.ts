import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { UnitOfMeasure } from '../entities/unit-of-measure.entity';

@Injectable()
export class UnitsOfMeasureRepository extends BaseRepository<UnitOfMeasure> {
  constructor() {
    super(UnitOfMeasure, true);
  }
}
