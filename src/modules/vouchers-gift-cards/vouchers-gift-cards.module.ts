import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersController } from './controllers/vouchers.controller';
import { GiftCardsController } from './controllers/gift-cards.controller';
import { VouchersService } from './services/vouchers.service';
import { GiftCardsService } from './services/gift-cards.service';
import { VouchersRepository } from '@/database/sql/repositories/vouchers.repository';
import { VoucherRedemptionsRepository } from '@/database/sql/repositories/voucher-redemptions.repository';
import { GiftCardsRepository } from '@/database/sql/repositories/gift-cards.repository';
import { GiftCardTransactionsRepository } from '@/database/sql/repositories/gift-card-transactions.repository';
import { Voucher } from '@/database/sql/entities/voucher.entity';
import { VoucherRedemption } from '@/database/sql/entities/voucher-redemption.entity';
import { GiftCard } from '@/database/sql/entities/gift-card.entity';
import { GiftCardTransaction } from '@/database/sql/entities/gift-card-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Voucher, VoucherRedemption, GiftCard, GiftCardTransaction])],
  controllers: [VouchersController, GiftCardsController],
  providers: [
    VouchersRepository,
    VoucherRedemptionsRepository,
    GiftCardsRepository,
    GiftCardTransactionsRepository,
    VouchersService,
    GiftCardsService,
  ],
  exports: [VouchersService, GiftCardsService],
})
export class VouchersGiftCardsModule {}
