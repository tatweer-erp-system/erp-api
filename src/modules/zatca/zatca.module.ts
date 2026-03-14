import { Module } from '@nestjs/common';
import { ZatcaController } from './controllers/zatca.controller';

@Module({
  controllers: [ZatcaController],
  providers: [],
  exports: [],
})
export class ZatcaModule {}
