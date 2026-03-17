import { Module } from '@nestjs/common';
import { PricelistsController } from './controllers/pricelists.controller';
import { PricelistItemsController } from './controllers/pricelist-items.controller';
import { PricelistsService } from './services/pricelists.service';

@Module({
  controllers: [PricelistsController, PricelistItemsController],
  providers: [PricelistsService],
  exports: [],
})
export class PricelistsModule {}
