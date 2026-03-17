import { Module } from '@nestjs/common';
import { FiscalPositionsController } from './controllers/fiscal-positions.controller';
import { FiscalPositionsService } from './services/fiscal-positions.service';

@Module({
  controllers: [FiscalPositionsController],
  providers: [FiscalPositionsService],
  exports: [FiscalPositionsService],
})
export class FiscalPositionsModule {}
