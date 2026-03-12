import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { WarehousesController } from './controllers/warehouses.controller';
import { WarehousesService } from './services/warehouses.service';
import { StockMovementsController } from './controllers/stock-movements.controller';
import { StockMovementsService } from './services/stock-movements.service';
import { LowStockProcessor } from './services/low-stock.processor';

@Module({
  controllers: [
    ProductsController,
    CategoriesController,
    WarehousesController,
    StockMovementsController,
  ],
  providers: [
    ProductsService,
    CategoriesService,
    WarehousesService,
    StockMovementsService,
    LowStockProcessor,
  ],
  exports: [ProductsService, CategoriesService, WarehousesService, StockMovementsService],
})
export class InventoryModule {}
