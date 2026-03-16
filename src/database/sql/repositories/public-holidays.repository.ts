import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PublicHoliday } from '../entities/public-holiday.entity';

@Injectable()
export class PublicHolidaysRepository extends BaseRepository<PublicHoliday> {
  constructor() {
    super(PublicHoliday, true);
  }
}
