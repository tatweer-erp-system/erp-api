import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ProductVariantsRepository } from '@/database/sql/repositories/product-variants.repository';
import { ProductVariantAttributeValuesRepository } from '@/database/sql/repositories/product-variant-attribute-values.repository';
import { ProductTemplateAttributesRepository } from '@/database/sql/repositories/product-template-attributes.repository';
import { ProductTemplateAttributeValuesRepository } from '@/database/sql/repositories/product-template-attribute-values.repository';
import { ProductsRepository } from '@/database/sql/repositories/products.repository';
import { AddTemplateAttributeDto } from '../dto/add-template-attribute.dto';
import { UpdateProductVariantDto } from '../dto/update-product-variant.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class ProductVariantsService {
  constructor(
    private readonly productVariantsRepository: ProductVariantsRepository,
    private readonly productVariantAttributeValuesRepository: ProductVariantAttributeValuesRepository,
    private readonly productTemplateAttributesRepository: ProductTemplateAttributesRepository,
    private readonly productTemplateAttributeValuesRepository: ProductTemplateAttributeValuesRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  // ── Template Attributes ───────────────────────────────────────────────────

  async getTemplateAttributes(tenantId: string, productId: string) {
    const product = await this.productsRepository.findById(tenantId, productId);
    if (!product) throw new NotFoundException('Product not found');

    const templateAttrs = await this.productTemplateAttributesRepository.findByProductId(
      tenantId,
      productId,
    );

    // For each template attribute, load its values
    for (const ta of templateAttrs) {
      ta.values = await this.productTemplateAttributeValuesRepository.findByTemplateAttributeId(
        tenantId,
        ta.id,
      );
    }

    return templateAttrs;
  }

  async addTemplateAttribute(
    tenantId: string,
    productId: string,
    dto: AddTemplateAttributeDto,
    auditContext: AuditContext,
  ) {
    const product = await this.productsRepository.findById(tenantId, productId);
    if (!product) throw new NotFoundException('Product not found');

    const exists = await this.productTemplateAttributesRepository.existsByProductAndAttribute(
      tenantId,
      productId,
      dto.attributeId,
    );
    if (exists) {
      throw new ConflictException('This attribute is already assigned to this product');
    }

    const transaction = await this.productVariantsRepository.getTransaction();
    try {
      const templateAttrId = await this.productTemplateAttributesRepository.create(
        tenantId,
        {
          productId,
          attributeId: dto.attributeId,
          sequence: dto.sequence ?? 0,
          createdBy: auditContext.userId ?? null,
        },
        transaction,
      );

      // Create template attribute values
      for (const val of dto.values) {
        await this.productTemplateAttributeValuesRepository.create(
          tenantId,
          {
            templateAttributeId: templateAttrId,
            attributeValueId: val.attributeValueId,
            priceExtra: val.priceExtra ?? 0,
            isActive: val.isActive ?? true,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        );
      }

      // Mark product as having variants
      if (!product.hasVariants) {
        await this.productsRepository.update(
          tenantId,
          productId,
          ['"hasVariants" = true', '"updatedAt" = NOW()', '"updatedBy" = :updatedBy'],
          { updatedBy: auditContext.userId ?? null },
          transaction,
        );
      }

      await transaction.commit();
      return this.getTemplateAttributes(tenantId, productId);
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  async removeTemplateAttribute(
    tenantId: string,
    templateAttributeId: string,
    auditContext: AuditContext,
  ): Promise<void> {
    const ta = await this.productTemplateAttributesRepository.findById(
      tenantId,
      templateAttributeId,
    );
    if (!ta) throw new NotFoundException('Template attribute not found');

    await this.productTemplateAttributesRepository.softDelete(
      tenantId,
      templateAttributeId,
      auditContext.userId ?? null,
    );
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  async findVariantsByProduct(tenantId: string, productId: string, pagination: PaginationDto) {
    const product = await this.productsRepository.findById(tenantId, productId);
    if (!product) throw new NotFoundException('Product not found');

    const { limit = 20, page = 1 } = pagination;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.productVariantsRepository.findByProductId(
      tenantId,
      productId,
      {
        limit,
        offset,
      },
    );

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findVariantById(tenantId: string, id: string) {
    const variant = await this.productVariantsRepository.findByIdWithAttributes(tenantId, id);
    if (!variant) throw new NotFoundException('Product variant not found');
    return variant;
  }

  async updateVariant(
    tenantId: string,
    id: string,
    dto: UpdateProductVariantDto,
    auditContext: AuditContext,
  ) {
    const existing = await this.productVariantsRepository.findById(tenantId, id);
    if (!existing) throw new NotFoundException('Product variant not found');
    if (existing.version !== dto.version) {
      throw new ConflictException('Version mismatch — please re-fetch and retry');
    }

    const updates: string[] = [
      '"updatedAt" = NOW()',
      '"updatedBy" = :updatedBy',
      'version = version + 1',
    ];
    const replacements: Record<string, unknown> = { updatedBy: auditContext.userId ?? null };

    if (dto.barcode !== undefined) {
      updates.push('barcode = :barcode');
      replacements.barcode = dto.barcode;
    }
    if (dto.internalRef !== undefined) {
      updates.push('"internalRef" = :internalRef');
      replacements.internalRef = dto.internalRef;
    }
    if (dto.priceExtra !== undefined) {
      updates.push('"priceExtra" = :priceExtra');
      replacements.priceExtra = dto.priceExtra;
    }
    if (dto.costPrice !== undefined) {
      updates.push('"costPrice" = :costPrice');
      replacements.costPrice = dto.costPrice;
    }
    if (dto.isActive !== undefined) {
      updates.push('"isActive" = :isActive');
      replacements.isActive = dto.isActive;
    }

    await this.productVariantsRepository.update(tenantId, id, updates, replacements);
    return this.findVariantById(tenantId, id);
  }

  // ── Generate Variants ─────────────────────────────────────────────────────

  async generateVariants(tenantId: string, productId: string, auditContext: AuditContext) {
    const product = await this.productsRepository.findById(tenantId, productId);
    if (!product) throw new NotFoundException('Product not found');

    // Get all active template attribute values grouped by attribute
    const allValues = await this.productTemplateAttributeValuesRepository.findActiveByProductId(
      tenantId,
      productId,
    );

    if (allValues.length === 0) {
      throw new BadRequestException('No active attribute values configured for this product');
    }

    // Group values by attributeId
    const attributeGroups = new Map<string, any[]>();
    for (const val of allValues) {
      const key = val.attributeId as string;
      if (!attributeGroups.has(key)) {
        attributeGroups.set(key, []);
      }
      attributeGroups.get(key)!.push(val);
    }

    const groupKeys = Array.from(attributeGroups.keys());
    if (groupKeys.length === 0) {
      throw new BadRequestException('No attribute groups found for variant generation');
    }

    // Compute cartesian product of all attribute value groups
    const combinations = this.cartesianProduct(groupKeys.map((key) => attributeGroups.get(key)!));

    const transaction = await this.productVariantsRepository.getTransaction();
    try {
      // Soft-delete existing variants for this product
      await this.productVariantsRepository.softDeleteByProductId(
        tenantId,
        productId,
        auditContext.userId ?? null,
        transaction,
      );

      const createdVariants: any[] = [];

      for (const combination of combinations) {
        // Build combination name: "Red / Large / Cotton"
        const nameEn = combination.map((v: any) => v.valueNameEn).join(' / ');
        const nameAr = combination.map((v: any) => v.valueNameAr).join(' / ');
        const combinationName = `${nameEn} | ${nameAr}`;

        // Sum priceExtra from all template attribute values in this combination
        const totalPriceExtra = combination.reduce(
          (sum: number, v: any) => sum + parseFloat(v.priceExtra || '0'),
          0,
        );

        const variantId = await this.productVariantsRepository.create(
          tenantId,
          {
            productId,
            combinationName,
            barcode: null,
            internalRef: null,
            priceExtra: totalPriceExtra,
            costPrice: null,
            isActive: true,
            createdBy: auditContext.userId ?? null,
          },
          transaction,
        );

        // Link variant to attribute values
        for (const val of combination) {
          await this.productVariantAttributeValuesRepository.create(
            tenantId,
            {
              variantId,
              attributeValueId: val.attributeValueId as string,
              createdBy: auditContext.userId ?? null,
            },
            transaction,
          );
        }

        createdVariants.push({ id: variantId, combinationName, priceExtra: totalPriceExtra });
      }

      // Mark product as having variants
      if (!product.hasVariants) {
        await this.productsRepository.update(
          tenantId,
          productId,
          ['"hasVariants" = true', '"updatedAt" = NOW()', '"updatedBy" = :updatedBy'],
          { updatedBy: auditContext.userId ?? null },
          transaction,
        );
      }

      await transaction.commit();

      return {
        generatedCount: createdVariants.length,
        variants: createdVariants,
      };
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  /**
   * Computes the cartesian product of an array of arrays.
   * Example: [[Red, Blue], [S, M, L]] => [[Red,S],[Red,M],[Red,L],[Blue,S],[Blue,M],[Blue,L]]
   */
  private cartesianProduct(arrays: any[][]): any[][] {
    if (arrays.length === 0) return [[]];
    return arrays.reduce<any[][]>(
      (acc, curr) => acc.flatMap((combo) => curr.map((item) => [...combo, item])),
      [[]],
    );
  }
}
