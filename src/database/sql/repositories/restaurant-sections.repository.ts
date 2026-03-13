import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { RestaurantSection } from '../entities/restaurant-section.entity';

@Injectable()
export class RestaurantSectionsRepository extends BaseRepository<RestaurantSection> {
  constructor() {
    super(RestaurantSection, true);
  }
}
