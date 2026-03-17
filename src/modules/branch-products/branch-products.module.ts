import { Module } from '@nestjs/common';
import { BranchProductsController } from './controllers/branch-products.controller';
import { BranchProductsService } from './services/branch-products.service';

@Module({
  controllers: [BranchProductsController],
  providers: [BranchProductsService],
  exports: [],
})
export class BranchProductsModule {}
