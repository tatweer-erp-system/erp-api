import { Injectable } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { VouchersRepository } from '@/database/sql/repositories/vouchers.repository';
import { VoucherRedemptionsRepository } from '@/database/sql/repositories/voucher-redemptions.repository';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { UpdateVoucherDto } from '../dto/update-voucher.dto';
import { ValidateVoucherDto } from '../dto/validate-voucher.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { DiscountType, VoucherType } from '@/common/enums/pos.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VoucherValidationResult } from '../interfaces/vouchers-gift-cards.interfaces';

@Injectable()
export class VouchersService {
  constructor(
    private readonly vouchersRepository: VouchersRepository,
    private readonly voucherRedemptionsRepository: VoucherRedemptionsRepository,
  ) {}

  async create(tenantId: string, dto: CreateVoucherDto, auditContext: AuditContext) {
    return this.vouchersRepository.create(
      {
        code: dto.code,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn ?? null,
        descriptionAr: dto.descriptionAr ?? null,
        type: dto.type ?? VoucherType.DISCOUNT,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderAmount: dto.minOrderAmount ?? 0,
        maxDiscountAmount: dto.maxDiscountAmount ?? null,
        maxUses: dto.maxUses ?? null,
        maxUsesPerCustomer: dto.maxUsesPerCustomer ?? 1,
        customerId: dto.customerId ?? null,
        validFrom: dto.validFrom ?? null,
        validUntil: dto.validUntil ?? null,
        isActive: dto.isActive ?? true,
      } as any,
      { tenantId, auditContext },
    );
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    return this.vouchersRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['code', 'nameEn', 'nameAr'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    return this.vouchersRepository.findById(id, { tenantId });
  }

  async update(tenantId: string, id: string, dto: UpdateVoucherDto, auditContext: AuditContext) {
    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.descriptionEn !== undefined) data.descriptionEn = dto.descriptionEn;
    if (dto.descriptionAr !== undefined) data.descriptionAr = dto.descriptionAr;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.discountType !== undefined) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined) data.discountValue = dto.discountValue;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxDiscountAmount !== undefined) data.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.maxUsesPerCustomer !== undefined) data.maxUsesPerCustomer = dto.maxUsesPerCustomer;
    if (dto.customerId !== undefined) data.customerId = dto.customerId;
    if (dto.validFrom !== undefined) data.validFrom = dto.validFrom;
    if (dto.validUntil !== undefined) data.validUntil = dto.validUntil;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.vouchersRepository.update(id, data as any, { tenantId, auditContext });
  }

  async delete(tenantId: string, id: string, auditContext: AuditContext) {
    return this.vouchersRepository.softDelete(id, { tenantId, auditContext });
  }

  async validate(tenantId: string, dto: ValidateVoucherDto): Promise<VoucherValidationResult> {
    // 1. Find voucher by code
    const voucher = await this.vouchersRepository.findOne({
      tenantId,
      where: { code: dto.code },
    });
    if (!voucher) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_FOUND, dto.code) };
    }

    // 2. Check active
    if (!voucher.isActive) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_INACTIVE, dto.code) };
    }

    // 3. Check date validity
    const today = new Date().toISOString().split('T')[0];
    if (voucher.validFrom && today < voucher.validFrom) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_VALID_FOR_TIME, dto.code) };
    }
    if (voucher.validUntil && today > voucher.validUntil) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_EXPIRED, dto.code) };
    }

    // 4. Check max uses
    if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_MAX_USES, dto.code) };
    }

    // 5. Check customer restriction
    if (voucher.customerId && dto.customerId !== voucher.customerId) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_FOR_CUSTOMER, dto.code) };
    }

    // 6. Check per-customer usage limit
    if (dto.customerId && voucher.maxUsesPerCustomer) {
      const customerRedemptions = await this.voucherRedemptionsRepository.count({
        where: { voucherId: voucher.id, customerId: dto.customerId },
      });
      if (customerRedemptions >= voucher.maxUsesPerCustomer) {
        return { valid: false, error: msg(ErrorMessages.VOUCHER_CUSTOMER_MAX_USES, dto.code) };
      }
    }

    // 7. Check minimum order amount
    const minOrderAmount = parseFloat(String(voucher.minOrderAmount)) || 0;
    if (dto.orderTotal < minOrderAmount) {
      return {
        valid: false,
        error: msg(ErrorMessages.VOUCHER_MIN_ORDER, dto.code, minOrderAmount, dto.orderTotal),
      };
    }

    // 8. Calculate discount
    const discountValue = parseFloat(String(voucher.discountValue));
    const maxDiscountAmount = voucher.maxDiscountAmount
      ? parseFloat(String(voucher.maxDiscountAmount))
      : null;
    let actual: number;

    if (voucher.discountType === DiscountType.PERCENT) {
      const raw = (dto.orderTotal * discountValue) / 100;
      actual = maxDiscountAmount !== null ? Math.min(raw, maxDiscountAmount) : raw;
    } else {
      actual = Math.min(discountValue, dto.orderTotal);
    }

    return {
      valid: true,
      discountAmount: Math.round(actual * 100) / 100,
      voucherId: voucher.id,
    };
  }

  async redeem(
    voucherId: string,
    orderId: string,
    customerId: string | null,
    discountApplied: number,
    transaction: Transaction,
  ): Promise<void> {
    // Insert redemption record
    await this.voucherRedemptionsRepository.create(
      {
        voucherId,
        orderId,
        customerId,
        discountApplied,
        redeemedAt: new Date(),
      } as any,
      { transaction },
    );

    // Atomic increment of used_count
    await this.vouchersRepository.rawQuery(
      `UPDATE vouchers SET "usedCount" = "usedCount" + 1, version = version + 1 WHERE id = :voucherId`,
      { voucherId },
      transaction,
    );
  }
}
