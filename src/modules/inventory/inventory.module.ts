import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';
import { WarehousesController } from './warehouses/warehouses.controller';
import { WarehousesService } from './warehouses/warehouses.service';
import { StockMovementsController } from './stock-movements/stock-movements.controller';
import { StockMovementsService } from './stock-movements/stock-movements.service';
import { LowStockProcessor } from './stock-movements/low-stock.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUE_INVENTORY } from '../../infrastructure/queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_INVENTORY }),
    NotificationsModule,
  ],
  controllers: [ProductsController, WarehousesController, StockMovementsController],
  providers: [ProductsService, WarehousesService, StockMovementsService, LowStockProcessor],
  exports: [ProductsService, WarehousesService, StockMovementsService],
})
export class InventoryModule {}
