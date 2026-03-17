import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { ShiftWorkingDay } from '../entities/shift-working-day.entity';

@Injectable()
export class ShiftWorkingDaysRepository extends BaseRepository<ShiftWorkingDay> {
  constructor() {
    super(ShiftWorkingDay, true);
  }
}
