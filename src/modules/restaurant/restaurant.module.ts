import { Module } from '@nestjs/common';
import { SectionsController } from './controllers/sections.controller';
import { TablesController } from './controllers/tables.controller';
import { TableSessionsController } from './controllers/table-sessions.controller';
import { KitchenController } from './controllers/kitchen.controller';
import { SectionsService } from './services/sections.service';
import { TablesService } from './services/tables.service';
import { TableSessionsService } from './services/table-sessions.service';
import { KitchenService } from './services/kitchen.service';

@Module({
  controllers: [SectionsController, TablesController, TableSessionsController, KitchenController],
  providers: [SectionsService, TablesService, TableSessionsService, KitchenService],
  exports: [],
})
export class RestaurantModule {}
