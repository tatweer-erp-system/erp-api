import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantSection } from '@/database/sql/entities/restaurant-section.entity';
import { RestaurantTable } from '@/database/sql/entities/restaurant-table.entity';
import { TableSession } from '@/database/sql/entities/table-session.entity';
import { KitchenTicket } from '@/database/sql/entities/kitchen-ticket.entity';
import { PosOrderItem } from '@/database/sql/entities/pos-order-item.entity';
import { Product } from '@/database/sql/entities/product.entity';
import { RestaurantSectionsRepository } from '@/database/sql/repositories/restaurant-sections.repository';
import { RestaurantTablesRepository } from '@/database/sql/repositories/restaurant-tables.repository';
import { TableSessionsRepository } from '@/database/sql/repositories/table-sessions.repository';
import { KitchenTicketsRepository } from '@/database/sql/repositories/kitchen-tickets.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { SectionsController } from './controllers/sections.controller';
import { TablesController } from './controllers/tables.controller';
import { TableSessionsController } from './controllers/table-sessions.controller';
import { KitchenController } from './controllers/kitchen.controller';
import { SectionsService } from './services/sections.service';
import { TablesService } from './services/tables.service';
import { TableSessionsService } from './services/table-sessions.service';
import { KitchenService } from './services/kitchen.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RestaurantSection,
      RestaurantTable,
      TableSession,
      KitchenTicket,
      PosOrderItem,
      Product,
    ]),
  ],
  controllers: [SectionsController, TablesController, TableSessionsController, KitchenController],
  providers: [
    RestaurantSectionsRepository,
    RestaurantTablesRepository,
    TableSessionsRepository,
    KitchenTicketsRepository,
    PosOrderItemsRepository,
    ProductsRepository,
    SectionsService,
    TablesService,
    TableSessionsService,
    KitchenService,
  ],
  exports: [
    RestaurantSectionsRepository,
    RestaurantTablesRepository,
    TableSessionsRepository,
    KitchenTicketsRepository,
  ],
})
export class RestaurantModule {}
