import { Module } from '@nestjs/common';
import { SequencesModule } from '@/modules/sequences/sequences.module';
import { OrdersController } from './controllers/orders.controller';
import { CashMovementsController } from './controllers/cash-movements.controller';
import { PosOrdersService } from './services/orders.service';
import { OrderItemsService } from './services/order-items.service';
import { PosCheckoutService } from './services/checkout.service';
import { RefundsService } from './services/refunds.service';
import { CashMovementsService } from './services/cash-movements.service';

@Module({
  imports: [SequencesModule],
  controllers: [OrdersController, CashMovementsController],
  providers: [
    PosOrdersService,
    OrderItemsService,
    PosCheckoutService,
    RefundsService,
    CashMovementsService,
  ],
  exports: [PosOrdersService, PosCheckoutService],
})
export class PosOrdersModule {}
