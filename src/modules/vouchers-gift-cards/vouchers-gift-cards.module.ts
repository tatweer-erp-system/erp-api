import { Module } from '@nestjs/common';
import { VouchersController } from './controllers/vouchers.controller';
import { GiftCardsController } from './controllers/gift-cards.controller';
import { VouchersService } from './services/vouchers.service';
import { GiftCardsService } from './services/gift-cards.service';

@Module({
  controllers: [VouchersController, GiftCardsController],
  providers: [VouchersService, GiftCardsService],
  exports: [VouchersService, GiftCardsService],
})
export class VouchersGiftCardsModule {}
