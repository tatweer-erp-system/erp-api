import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { WarehousesController } from './controllers/warehouses.controller';
import { WarehousesService } from './services/warehouses.service';
import { StockMovementsController } from './controllers/stock-movements.controller';
import { StockMovementsService } from './services/stock-movements.service';
import { AdjustmentsController } from './controllers/adjustments.controller';
import { AdjustmentsService } from './services/adjustments.service';
import { TransfersController } from './controllers/transfers.controller';
import { TransfersService } from './services/transfers.service';
import { InventoryService } from './services/inventory.service';
import { LowStockProcessor } from './services/low-stock.processor';
import { InventoryDefinitionsController } from './controllers/inventory-definitions.controller';
import { InventoryDefinitionsService } from './services/inventory-definitions.service';

@Module({
  controllers: [
    ProductsController,
    CategoriesController,
    WarehousesController,
    StockMovementsController,
    AdjustmentsController,
    TransfersController,
    InventoryDefinitionsController,
  ],
  providers: [
    ProductsService,
    CategoriesService,
    WarehousesService,
    StockMovementsService,
    AdjustmentsService,
    TransfersService,
    InventoryService,
    LowStockProcessor,
    InventoryDefinitionsService,
  ],
  exports: [],
})
export class InventoryModule {}
