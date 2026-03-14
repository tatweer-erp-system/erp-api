import { Module } from '@nestjs/common';
import { CashiersController } from './controllers/cashiers.controller';
import { OverridesController } from './controllers/overrides.controller';
import { PosCashiersService } from './services/cashiers.service';
import { OverridesService } from './services/overrides.service';

@Module({
  controllers: [CashiersController, OverridesController],
  providers: [PosCashiersService, OverridesService],
  exports: [],
})
export class PosCashiersModule {}
