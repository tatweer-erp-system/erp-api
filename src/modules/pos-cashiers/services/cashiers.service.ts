import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PosCashiersRepository } from '@/database/sql/repositories/pos-cashiers.repository';
import { CreateCashierDto } from '../dto/create-cashier.dto';
import { UpdateCashierDto } from '../dto/update-cashier.dto';
import { SetPinDto } from '../dto/set-pin.dto';
import { AuthenticatePinDto } from '../dto/authenticate-pin.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { PosCashier } from '@/database/sql/entities/pos-cashier.entity';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MINUTES } from '@/common/constants/pos.constants';

const BCRYPT_ROUNDS = 10;

function excludePinHash(cashier: PosCashier | Record<string, unknown>): Record<string, unknown> {
  const plain =
    typeof (cashier as any).get === 'function'
      ? ((cashier as PosCashier).get({ plain: true }) as unknown as Record<string, unknown>)
      : { ...(cashier as Record<string, unknown>) };
  delete plain.pinHash;
  delete plain.pinHash;
  return plain;
}

function excludePinHashFromList(data: Record<string, unknown>): Record<string, unknown> {
  if (data && Array.isArray(data.data)) {
    data.data = data.data.map((item: Record<string, unknown>) => {
      const copy = { ...item };
      delete copy.pinHash;
      delete copy.pinHash;
      return copy;
    });
  }
  return data;
}

@Injectable()
export class PosCashiersService {
  constructor(private readonly posCashiersRepository: PosCashiersRepository) {}

  async create(tenantId: string, dto: CreateCashierDto, auditContext: AuditContext) {
    const pinHash = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);

    const cashier = await this.posCashiersRepository.create(
      {
        userId: dto.userId,
        pinHash,
        displayName: dto.displayName,
        isActive: dto.isActive ?? true,
        maxDiscountPct: dto.maxDiscountPct ?? 10,
        canRefund: dto.canRefund ?? false,
        canVoid: dto.canVoid ?? false,
        canOpenDrawer: dto.canOpenDrawer ?? true,
        failedPinAttempts: 0,
        lockedUntil: null,
      } as any,
      { tenantId, auditContext },
    );

    return excludePinHash(cashier);
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    const result = await this.posCashiersRepository.findAll({
      tenantId,
      page: pagination.page,
      limit: pagination.limit,
      search: pagination.search,
      searchFields: ['displayName'],
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
    });

    return excludePinHashFromList(result as unknown as Record<string, unknown>);
  }

  async findById(tenantId: string, id: string) {
    const cashier = await this.posCashiersRepository.findById(id, { tenantId });
    return excludePinHash(cashier);
  }

  async update(tenantId: string, id: string, dto: UpdateCashierDto, auditContext: AuditContext) {
    const updateData: Record<string, unknown> = {};

    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.maxDiscountPct !== undefined) updateData.maxDiscountPct = dto.maxDiscountPct;
    if (dto.canRefund !== undefined) updateData.canRefund = dto.canRefund;
    if (dto.canVoid !== undefined) updateData.canVoid = dto.canVoid;
    if (dto.canOpenDrawer !== undefined) updateData.canOpenDrawer = dto.canOpenDrawer;

    const cashier = await this.posCashiersRepository.update(id, updateData as any, {
      tenantId,
      auditContext,
    });

    return excludePinHash(cashier);
  }

  async softDelete(tenantId: string, id: string, auditContext: AuditContext) {
    await this.posCashiersRepository.softDelete(id, { tenantId, auditContext });
  }

  async setPin(tenantId: string, id: string, dto: SetPinDto, auditContext: AuditContext) {
    const pinHash = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);

    const cashier = await this.posCashiersRepository.update(
      id,
      {
        pinHash,
        failedPinAttempts: 0,
        lockedUntil: null,
      } as any,
      { tenantId, auditContext },
    );

    return excludePinHash(cashier);
  }

  async authenticatePin(tenantId: string, dto: AuthenticatePinDto) {
    const cashier = await this.posCashiersRepository.findOne({
      tenantId,
      where: { userId: dto.userId, isActive: true },
    });

    if (!cashier) {
      throw new NotFoundException(msg(ErrorMessages.CASHIER_NOT_FOUND, dto.userId));
    }

    // Check if account is locked
    if (cashier.lockedUntil && new Date(cashier.lockedUntil) > new Date()) {
      throw new BadRequestException(
        msg(ErrorMessages.ACCOUNT_LOCKED, new Date(cashier.lockedUntil).toISOString()),
      );
    }

    const isValid = await bcrypt.compare(dto.pin, cashier.pinHash);

    if (!isValid) {
      // Atomically increment failed attempts
      await this.posCashiersRepository.rawQuery(
        `UPDATE pos_cashiers
         SET "failedPinAttempts" = "failedPinAttempts" + 1,
             "lockedUntil" = CASE
               WHEN "failedPinAttempts" + 1 >= :maxAttempts
               THEN NOW() + INTERVAL '1 minute' * :lockMinutes
               ELSE "lockedUntil"
             END,
             "updatedAt" = NOW()
         WHERE id = :id AND "tenantId" = :tenantId`,
        {
          id: cashier.id,
          tenantId,
          maxAttempts: MAX_PIN_ATTEMPTS,
          lockMinutes: PIN_LOCKOUT_MINUTES,
        },
      );

      throw new BadRequestException(
        msg(ErrorMessages.INVALID_PIN, MAX_PIN_ATTEMPTS - (cashier.failedPinAttempts + 1)),
      );
    }

    // Reset failed attempts on successful auth
    await this.posCashiersRepository.update(
      cashier.id,
      {
        failedPinAttempts: 0,
        lockedUntil: null,
      } as any,
      { tenantId },
    );

    return excludePinHash(cashier);
  }

  async authenticateManagerPin(tenantId: string, managerUserId: string, pin: string) {
    const manager = await this.posCashiersRepository.findOne({
      tenantId,
      where: { userId: managerUserId, isActive: true },
    });

    if (!manager) {
      throw new NotFoundException(msg(ErrorMessages.MANAGER_NOT_FOUND, managerUserId));
    }

    if (manager.lockedUntil && new Date(manager.lockedUntil) > new Date()) {
      throw new BadRequestException(
        msg(ErrorMessages.ACCOUNT_LOCKED, new Date(manager.lockedUntil).toISOString()),
      );
    }

    const isValid = await bcrypt.compare(pin, manager.pinHash);

    if (!isValid) {
      await this.posCashiersRepository.rawQuery(
        `UPDATE pos_cashiers
         SET "failedPinAttempts" = "failedPinAttempts" + 1,
             "lockedUntil" = CASE
               WHEN "failedPinAttempts" + 1 >= :maxAttempts
               THEN NOW() + INTERVAL '1 minute' * :lockMinutes
               ELSE "lockedUntil"
             END,
             "updatedAt" = NOW()
         WHERE id = :id AND "tenantId" = :tenantId`,
        {
          id: manager.id,
          tenantId,
          maxAttempts: MAX_PIN_ATTEMPTS,
          lockMinutes: PIN_LOCKOUT_MINUTES,
        },
      );

      throw new BadRequestException(
        msg(ErrorMessages.INVALID_MANAGER_PIN, MAX_PIN_ATTEMPTS - (manager.failedPinAttempts + 1)),
      );
    }

    // Reset failed attempts
    await this.posCashiersRepository.update(
      manager.id,
      {
        failedPinAttempts: 0,
        lockedUntil: null,
      } as any,
      { tenantId },
    );

    return manager;
  }
}
