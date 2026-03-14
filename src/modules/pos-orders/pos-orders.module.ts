import { Module } from '@nestjs/common';
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
  controllers: [OrdersController, CashMovementsController],
  providers: [
    PosOrdersService,
    OrderItemsService,
    PosCheckoutService,
    RefundsService,
    CashMovementsService,
    PosSyncService,
    SequencesService,
  ],
  exports: [],
})
export class PosOrdersModule {}
