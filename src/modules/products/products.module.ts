import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '@/database/sql/entities/product.entity';
import { ProductCategory } from '@/database/sql/entities/product-category.entity';
import { UnitOfMeasure } from '@/database/sql/entities/unit-of-measure.entity';
import { Tax } from '@/database/sql/entities/tax.entity';
import { Pricelist } from '@/database/sql/entities/pricelist.entity';
import { PricelistItem } from '@/database/sql/entities/pricelist-item.entity';
import { BranchProduct } from '@/database/sql/entities/branch-product.entity';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { ProductCategoriesRepository } from '@/database/sql/repositories/product-categories.repository';
import { TaxesRepository } from '@/database/sql/repositories/taxes.repository';
import { PricelistsRepository } from '@/database/sql/repositories/pricelists.repository';
import { BranchProductsRepository } from '@/database/sql/repositories/branch-products.repository';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controllers/products.controller';
import { ProductCategoriesController } from './controllers/product-categories.controller';
import { BranchProductsController } from './controllers/branch-products.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductCategory,
      UnitOfMeasure,
      Tax,
      Pricelist,
      PricelistItem,
      BranchProduct,
    ]),
  ],
  controllers: [ProductsController, ProductCategoriesController, BranchProductsController],
  providers: [
    ProductsService,
    ProductsRepository,
    ProductCategoriesRepository,
    TaxesRepository,
    PricelistsRepository,
    BranchProductsRepository,
  ],
  exports: [ProductsService, ProductsRepository, TaxesRepository, PricelistsRepository],
})
export class ProductsModule {}
