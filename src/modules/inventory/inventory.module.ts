import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { ProductsRepository } from './products/products.repository';
import { CategoriesController } from './products/categories.controller';
import { CategoriesService } from './products/categories.service';
import { CategoriesRepository } from './products/categories.repository';
import { WarehousesController } from './warehouses/warehouses.controller';
import { WarehousesService } from './warehouses/warehouses.service';
import { WarehousesRepository } from './warehouses/warehouses.repository';
import { StockMovementsController } from './stock-movements/stock-movements.controller';
import { StockMovementsService } from './stock-movements/stock-movements.service';
import { StockMovementsRepository } from './stock-movements/stock-movements.repository';
import { StockLevelsRepository } from './stock-movements/stock-levels.repository';
import { LowStockProcessor } from './stock-movements/low-stock.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUE_INVENTORY } from '../../infrastructure/queues/queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_INVENTORY }), NotificationsModule],
  controllers: [
    ProductsController,
    CategoriesController,
    WarehousesController,
    StockMovementsController,
  ],
  providers: [
    ProductsService,
    ProductsRepository,
    CategoriesService,
    CategoriesRepository,
    WarehousesService,
    WarehousesRepository,
    StockMovementsService,
    StockMovementsRepository,
    StockLevelsRepository,
    LowStockProcessor,
  ],
  exports: [ProductsService, CategoriesService, WarehousesService, StockMovementsService],
})
export class InventoryModule {}
