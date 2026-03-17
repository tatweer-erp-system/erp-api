import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Activity } from '../entities/activity.entity';

@Injectable()
export class ActivitiesRepository extends BaseRepository<Activity> {
  constructor() {
    super(Activity, true);
  }
}
