import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { TaxesController } from './controllers/taxes.controller';
import { TaxesService } from './services/taxes.service';
import { PricelistsController } from './controllers/pricelists.controller';
import { PricelistsService } from './services/pricelists.service';

// New TypeORM entities
import { Warehouse } from '@/database/sql/entities/warehouse.entity';
import { StockLocation } from '@/database/sql/entities/stock-location.entity';
import { StockMove } from '@/database/sql/entities/stock-move.entity';
import { StockQuant } from '@/database/sql/entities/stock-quant.entity';
import { InventoryAdjustment } from '@/database/sql/entities/inventory-adjustment.entity';
import { InventoryAdjustmentLine } from '@/database/sql/entities/inventory-adjustment-line.entity';
import { ReorderRule } from '@/database/sql/entities/reorder-rule.entity';
import { Transfer } from '@/database/sql/entities/transfer.entity';
import { TransferLine } from '@/database/sql/entities/transfer-line.entity';

// New TypeORM repositories
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { StockLocationsRepository } from '@/database/sql/repositories/stock-locations.repository';
import { StockMovesRepository } from '@/database/sql/repositories/stock-moves.repository';
import { StockQuantsRepository } from '@/database/sql/repositories/stock-quants.repository';
import { InventoryAdjustmentsRepository } from '@/database/sql/repositories/inventory-adjustments.repository';
import { ReorderRulesRepository } from '@/database/sql/repositories/reorder-rules.repository';
import { TransfersRepository } from '@/database/sql/repositories/transfers.repository';

// New service and controllers
import { InventoryOpsService } from './services/inventory-ops.service';
import { StockLocationsController } from './controllers/stock-locations.controller';
import { InventoryAdjustmentsController } from './controllers/inventory-adjustments.controller';
import { ReorderRulesController } from './controllers/reorder-rules.controller';
import { TransfersOpsController } from './controllers/transfers-ops.controller';
import { StockQuantsController } from './controllers/stock-quants.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      StockLocation,
      StockMove,
      StockQuant,
      InventoryAdjustment,
      InventoryAdjustmentLine,
      ReorderRule,
      Transfer,
      TransferLine,
    ]),
  ],
  controllers: [
    ProductsController,
    CategoriesController,
    WarehousesController,
    StockMovementsController,
    AdjustmentsController,
    TransfersController,
    InventoryDefinitionsController,
    TaxesController,
    PricelistsController,
    // New TypeORM-based controllers
    StockLocationsController,
    InventoryAdjustmentsController,
    ReorderRulesController,
    TransfersOpsController,
    StockQuantsController,
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
    TaxesService,
    PricelistsService,
    // New TypeORM-based repositories and service
    WarehousesRepository,
    StockLocationsRepository,
    StockMovesRepository,
    StockQuantsRepository,
    InventoryAdjustmentsRepository,
    ReorderRulesRepository,
    TransfersRepository,
    InventoryOpsService,
  ],
  exports: [InventoryOpsService, StockQuantsRepository, StockMovesRepository],
})
export class InventoryModule {}
