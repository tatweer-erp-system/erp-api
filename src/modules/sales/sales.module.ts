import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesOrdersController } from './controllers/sales-orders.controller';
import { SalesDefinitionsController } from './controllers/sales-definitions.controller';
import { SalesOrdersService } from './services/sales-orders.service';
import { SalesDefinitionsService } from './services/sales-definitions.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

// New TypeORM entities
import { SalesOrder } from '@/database/sql/entities/sales-order.entity';
import { SalesOrderLine } from '@/database/sql/entities/sales-order-line.entity';
import { Delivery } from '@/database/sql/entities/delivery.entity';
import { DeliveryLine } from '@/database/sql/entities/delivery-line.entity';

// New TypeORM repositories
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { DeliveriesRepository } from '@/database/sql/repositories/deliveries.repository';

// New service and controllers
import { SalesOpsService } from './services/sales-ops.service';
import { SalesOrdersOpsController } from './controllers/sales-orders-ops.controller';
import { DeliveriesController } from './controllers/deliveries.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SalesOrder, SalesOrderLine, Delivery, DeliveryLine])],
  controllers: [
    SalesOrdersController,
    SalesDefinitionsController,
    // New TypeORM-based controllers
    SalesOrdersOpsController,
    DeliveriesController,
  ],
  providers: [
    SalesOrdersService,
    SalesDefinitionsService,
    SequencesService,
    // New TypeORM-based repositories and service
    SalesOrdersRepository,
    DeliveriesRepository,
    SalesOpsService,
  ],
  exports: [SalesOpsService, SalesOrdersRepository, DeliveriesRepository],
})
export class SalesModule {}
