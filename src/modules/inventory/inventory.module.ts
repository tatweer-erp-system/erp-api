import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { ProductsRepository } from '../../database/repositories/products.repository';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { CategoriesRepository } from '../../database/repositories/categories.repository';
import { WarehousesController } from './controllers/warehouses.controller';
import { WarehousesService } from './services/warehouses.service';
import { WarehousesRepository } from '../../database/repositories/warehouses.repository';
import { StockMovementsController } from './controllers/stock-movements.controller';
import { StockMovementsService } from './services/stock-movements.service';
import { StockMovementsRepository } from '../../database/repositories/stock-movements.repository';
import { StockLevelsRepository } from '../../database/repositories/stock-levels.repository';
import { LowStockProcessor } from './services/low-stock.processor';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
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
