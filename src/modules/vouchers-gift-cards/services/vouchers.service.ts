import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import { VouchersRepository } from '@/database/sql/repositories/vouchers.repository';
import { VoucherRedemptionsRepository } from '@/database/sql/repositories/voucher-redemptions.repository';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { UpdateVoucherDto } from '../dto/update-voucher.dto';
import { ValidateVoucherDto } from '../dto/validate-voucher.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { DiscountType } from '@/common/enums/pos.enums';
import { VoucherType, VoucherStatus } from '@/common/enums/loyalty.enums';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { VoucherValidationResult } from '../interfaces/vouchers-gift-cards.interfaces';

@Injectable()
export class VouchersService {
  constructor(
    private readonly vouchersRepository: VouchersRepository,
    private readonly voucherRedemptionsRepository: VoucherRedemptionsRepository,
  ) {}

  async create(_tenantId: string, dto: CreateVoucherDto, _auditContext: AuditContext) {
    // Map CreateVoucherDto fields to new Voucher entity fields
    // discountType PERCENT -> VoucherType.PERCENTAGE, FIXED -> VoucherType.FIXED
    let voucherType: VoucherType;
    if (dto.discountType === DiscountType.PERCENT) {
      voucherType = VoucherType.PERCENTAGE;
    } else {
      voucherType = VoucherType.FIXED;
    }

    return this.vouchersRepository.create({
      code: dto.code,
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      voucherType,
      value: dto.discountValue,
      minOrderAmount: dto.minOrderAmount ?? 0,
      usageLimit: dto.maxUses ?? null,
      usageCount: 0,
      customerId: dto.customerId ?? null,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      status: (dto.isActive ?? true) ? VoucherStatus.ACTIVE : VoucherStatus.CANCELLED,
    });
  }

  async findAll(_tenantId: string, pagination: PaginationDto) {
    return this.vouchersRepository.findAll({}, pagination.page ?? 1, pagination.limit ?? 20);
  }

  async findById(_tenantId: string, id: string) {
    return this.vouchersRepository.findById(id);
  }

  async update(_tenantId: string, id: string, dto: UpdateVoucherDto, _auditContext: AuditContext) {
    const voucher = await this.vouchersRepository.findById(id);
    const data: Record<string, unknown> = {};
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.discountValue !== undefined) data.value = dto.discountValue;
    if (dto.minOrderAmount !== undefined) data.minOrderAmount = dto.minOrderAmount;
    if (dto.maxUses !== undefined) data.usageLimit = dto.maxUses;
    if (dto.customerId !== undefined) data.customerId = dto.customerId;
    if (dto.validFrom !== undefined)
      data.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validUntil !== undefined)
      data.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    if (dto.isActive !== undefined) {
      data.status = dto.isActive ? VoucherStatus.ACTIVE : VoucherStatus.CANCELLED;
    }
    if (dto.discountType !== undefined) {
      data.voucherType =
        dto.discountType === DiscountType.PERCENT ? VoucherType.PERCENTAGE : VoucherType.FIXED;
    }
    return this.vouchersRepository.update(id, voucher.version, data as any);
  }

  async delete(_tenantId: string, id: string, _auditContext: AuditContext) {
    return this.vouchersRepository.softDelete(id);
  }

  /**
   * Validates a voucher code for a given order.
   * Checks: existence, status, date range, usage limits, customer restriction, min order amount.
   * Returns calculated discount amount.
   */
  async validate(_tenantId: string, dto: ValidateVoucherDto): Promise<VoucherValidationResult> {
    const voucher = await this.vouchersRepository.findByCode(dto.code);
    if (!voucher) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_FOUND, dto.code) };
    }

    if (voucher.status !== VoucherStatus.ACTIVE) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_INACTIVE, dto.code) };
    }

    const today = new Date().toISOString().split('T')[0];
    if (voucher.validFrom && today < voucher.validFrom.toString().substring(0, 10)) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_VALID_FOR_TIME, dto.code) };
    }
    if (voucher.validUntil && today > voucher.validUntil.toString().substring(0, 10)) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_EXPIRED, dto.code) };
    }

    if (voucher.usageLimit !== null && voucher.usageCount >= voucher.usageLimit) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_MAX_USES, dto.code) };
    }

    if (voucher.customerId && dto.customerId !== voucher.customerId) {
      return { valid: false, error: msg(ErrorMessages.VOUCHER_NOT_FOR_CUSTOMER, dto.code) };
    }

    const minOrderAmount = Number(voucher.minOrderAmount) || 0;
    if (dto.orderTotal < minOrderAmount) {
      return {
        valid: false,
        error: msg(ErrorMessages.VOUCHER_MIN_ORDER, dto.code, minOrderAmount, dto.orderTotal),
      };
    }

    const value = Number(voucher.value) || 0;
    let discountAmount: number;
    if (voucher.voucherType === VoucherType.PERCENTAGE) {
      discountAmount = (dto.orderTotal * value) / 100;
    } else {
      discountAmount = Math.min(value, dto.orderTotal);
    }

    return {
      valid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      voucherId: voucher.id,
    };
  }

  /**
   * Applies a voucher to an order — increments usage count and records redemption.
   */
  async applyVoucher(
    code: string,
    orderId: string,
    customerId: string | null,
    discountApplied: number,
  ): Promise<void> {
    const voucher = await this.vouchersRepository.findByCode(code);
    if (!voucher) {
      throw new NotFoundException(msg(ErrorMessages.VOUCHER_NOT_FOUND, code));
    }

    await this.voucherRedemptionsRepository.create({
      voucherId: voucher.id,
      orderId,
      customerId,
      discountApplied,
    });

    await this.vouchersRepository.incrementUsage(voucher.id);

    // Mark as USED if it was a single-use voucher
    if (voucher.usageLimit === 1) {
      await this.vouchersRepository.update(voucher.id, voucher.version + 1, {
        status: VoucherStatus.USED,
      } as any);
    }
  }

  /**
   * Redeem alias used by external callers (e.g. POS order service).
   */
  async redeem(
    voucherId: string,
    orderId: string,
    customerId: string | null,
    discountApplied: number,
  ): Promise<void> {
    await this.voucherRedemptionsRepository.create({
      voucherId,
      orderId,
      customerId,
      discountApplied,
    });
    await this.vouchersRepository.incrementUsage(voucherId);
  }
}
