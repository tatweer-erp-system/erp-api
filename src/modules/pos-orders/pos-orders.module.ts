import { Module } from '@nestjs/common';
import { SequencesModule } from '@/modules/sequences/sequences.module';
import { VouchersGiftCardsModule } from '@/modules/vouchers-gift-cards/vouchers-gift-cards.module';
import { OrdersController } from './controllers/orders.controller';
import { CashMovementsController } from './controllers/cash-movements.controller';
import { PosOrdersService } from './services/orders.service';
import { OrderItemsService } from './services/order-items.service';
import { PosCheckoutService } from './services/checkout.service';
import { RefundsService } from './services/refunds.service';
import { CashMovementsService } from './services/cash-movements.service';
import { VouchersService } from '@/modules/vouchers-gift-cards/services/vouchers.service';

@Module({
  imports: [SequencesModule, VouchersGiftCardsModule],
  controllers: [OrdersController, CashMovementsController],
  providers: [
    PosOrdersService,
    OrderItemsService,
    PosCheckoutService,
    RefundsService,
    CashMovementsService,
    {
      provide: 'VouchersService',
      useExisting: VouchersService,
    },
  ],
  exports: [PosOrdersService, PosCheckoutService],
})
export class PosOrdersModule {}
