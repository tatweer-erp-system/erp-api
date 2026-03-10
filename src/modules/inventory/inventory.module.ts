import { Module } from '@nestjs/common';
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

@Module({
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
