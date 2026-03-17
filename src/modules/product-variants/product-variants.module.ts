import { Module } from '@nestjs/common';
import { ProductAttributesController } from './controllers/product-attributes.controller';
import { ProductAttributeValuesController } from './controllers/product-attribute-values.controller';
import { ProductVariantsController } from './controllers/product-variants.controller';
import { ProductVariantsDetailController } from './controllers/product-variants-detail.controller';
import { ComboProductsController } from './controllers/combo-products.controller';
import { ComboGroupsController } from './controllers/combo-groups.controller';
import { ComboGroupItemsController } from './controllers/combo-group-items.controller';
import { ProductAttributesService } from './services/product-attributes.service';
import { ProductVariantsService } from './services/product-variants.service';
import { ComboProductsService } from './services/combo-products.service';
import { ProductAttributesRepository } from '@/database/sql/repositories/product-attributes.repository';
import { ProductAttributeValuesRepository } from '@/database/sql/repositories/product-attribute-values.repository';
import { ProductTemplateAttributesRepository } from '@/database/sql/repositories/product-template-attributes.repository';
import { ProductTemplateAttributeValuesRepository } from '@/database/sql/repositories/product-template-attribute-values.repository';
import { ProductVariantsRepository } from '@/database/sql/repositories/product-variants.repository';
import { ProductVariantAttributeValuesRepository } from '@/database/sql/repositories/product-variant-attribute-values.repository';
import { ProductTaxesRepository } from '@/database/sql/repositories/product-taxes.repository';
import { ComboProductsRepository } from '@/database/sql/repositories/combo-products.repository';
import { ComboGroupsRepository } from '@/database/sql/repositories/combo-groups.repository';
import { ComboGroupItemsRepository } from '@/database/sql/repositories/combo-group-items.repository';

@Module({
  controllers: [
    ProductAttributesController,
    ProductAttributeValuesController,
    ProductVariantsController,
    ProductVariantsDetailController,
    ComboProductsController,
    ComboGroupsController,
    ComboGroupItemsController,
  ],
  providers: [
    // Services
    ProductAttributesService,
    ProductVariantsService,
    ComboProductsService,
    // Repositories (registered locally since we cannot modify database.module.ts)
    ProductAttributesRepository,
    ProductAttributeValuesRepository,
    ProductTemplateAttributesRepository,
    ProductTemplateAttributeValuesRepository,
    ProductVariantsRepository,
    ProductVariantAttributeValuesRepository,
    ProductTaxesRepository,
    ComboProductsRepository,
    ComboGroupsRepository,
    ComboGroupItemsRepository,
  ],
  exports: [],
})
export class ProductVariantsModule {}
