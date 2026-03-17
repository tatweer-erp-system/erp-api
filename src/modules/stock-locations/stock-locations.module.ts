import { Module } from '@nestjs/common';
import { StockLocationsController } from './controllers/stock-locations.controller';
import { StockLocationsService } from './services/stock-locations.service';
import { StockLocationsRepository } from '@/database/sql/repositories/stock-locations.repository';

@Module({
  controllers: [StockLocationsController],
  providers: [StockLocationsService, StockLocationsRepository],
  exports: [StockLocationsService],
})
export class StockLocationsModule {}
