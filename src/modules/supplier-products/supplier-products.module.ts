import { Module } from '@nestjs/common';
import { SupplierProductsController } from './controllers/supplier-products.controller';
import { SupplierProductsService } from './services/supplier-products.service';

@Module({
  controllers: [SupplierProductsController],
  providers: [SupplierProductsService],
  exports: [],
})
export class SupplierProductsModule {}
