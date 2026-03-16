import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosOrder } from '@/database/sql/entities/pos-order.entity';
import { PosOrderItem } from '@/database/sql/entities/pos-order-item.entity';
import { PosPayment } from '@/database/sql/entities/pos-payment.entity';
import { PosRefund } from '@/database/sql/entities/pos-refund.entity';
import { PosHeldOrder } from '@/database/sql/entities/pos-held-order.entity';
import { PosSession } from '@/database/sql/entities/pos-session.entity';
import { PosOrdersRepository } from '@/database/sql/repositories/pos-orders.repository';
import { PosOrderItemsRepository } from '@/database/sql/repositories/pos-order-items.repository';
import { PosPaymentsRepository } from '@/database/sql/repositories/pos-payments.repository';
import { PosRefundsRepository } from '@/database/sql/repositories/pos-refunds.repository';
import { PosHeldOrdersRepository } from '@/database/sql/repositories/pos-held-orders.repository';
import { PosSessionsRepository } from '@/database/sql/repositories/pos-sessions.repository';
import { OrdersController } from './controllers/orders.controller';
import { CashMovementsController } from './controllers/cash-movements.controller';
import { PosOrdersService } from './services/orders.service';
import { OrderItemsService } from './services/order-items.service';
import { PosCheckoutService } from './services/checkout.service';
import { RefundsService } from './services/refunds.service';
import { CashMovementsService } from './services/cash-movements.service';
import { PosSyncService } from './services/pos-sync.service';
import { SequencesService } from '@/modules/sequences/services/sequences.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PosOrder,
      PosOrderItem,
      PosPayment,
      PosRefund,
      PosHeldOrder,
      PosSession,
    ]),
  ],
  controllers: [OrdersController, CashMovementsController],
  providers: [
    PosOrdersRepository,
    PosOrderItemsRepository,
    PosPaymentsRepository,
    PosRefundsRepository,
    PosHeldOrdersRepository,
    PosSessionsRepository,
    PosOrdersService,
    OrderItemsService,
    PosCheckoutService,
    RefundsService,
    CashMovementsService,
    PosSyncService,
    SequencesService,
  ],
  exports: [
    PosOrdersRepository,
    PosPaymentsRepository,
    PosRefundsRepository,
    PosSessionsRepository,
  ],
})
export class PosOrdersModule {}
