import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PosCashier } from '@/database/sql/entities/pos-cashier.entity';
import { ManagerOverride } from '@/database/sql/entities/manager-override.entity';
import { PosCashiersRepository } from '@/database/sql/repositories/pos-cashiers.repository';
import { ManagerOverridesRepository } from '@/database/sql/repositories/manager-overrides.repository';
import { CashiersController } from './controllers/cashiers.controller';
import { OverridesController } from './controllers/overrides.controller';
import { PosCashiersService } from './services/cashiers.service';
import { OverridesService } from './services/overrides.service';

@Module({
  imports: [TypeOrmModule.forFeature([PosCashier, ManagerOverride])],
  controllers: [CashiersController, OverridesController],
  providers: [
    PosCashiersRepository,
    ManagerOverridesRepository,
    PosCashiersService,
    OverridesService,
  ],
  exports: [PosCashiersRepository, ManagerOverridesRepository, PosCashiersService],
})
export class PosCashiersModule {}
