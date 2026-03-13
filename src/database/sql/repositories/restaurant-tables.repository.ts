import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { RestaurantTable } from '../entities/restaurant-table.entity';

@Injectable()
export class RestaurantTablesRepository extends BaseRepository<RestaurantTable> {
  constructor() {
    super(RestaurantTable, true);
  }
}
