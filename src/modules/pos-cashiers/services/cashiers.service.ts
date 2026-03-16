import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PosCashiersRepository } from '@/database/sql/repositories/pos-cashiers.repository';
import { PosCashier } from '@/database/sql/entities/pos-cashier.entity';
import { CreateCashierDto } from '../dto/create-cashier.dto';
import { UpdateCashierDto } from '../dto/update-cashier.dto';
import { SetPinDto } from '../dto/set-pin.dto';
import { AuthenticatePinDto } from '../dto/authenticate-pin.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { ErrorMessages } from '@/common/i18n/errors.i18n';
import { msg } from '@/common/i18n/error.helper';
import { MAX_PIN_ATTEMPTS, PIN_LOCKOUT_MINUTES } from '@/common/constants/pos.constants';

const BCRYPT_ROUNDS = 10;

function excludePinHash(cashier: PosCashier | Record<string, unknown>): Record<string, unknown> {
  const plain = { ...(cashier as Record<string, unknown>) };
  delete plain['pinHash'];
  return plain;
}

function excludePinHashFromList(data: Record<string, unknown>): Record<string, unknown> {
  if (data && Array.isArray(data['data'])) {
    data['data'] = (data['data'] as Record<string, unknown>[]).map((item) => {
      const copy = { ...item };
      delete copy['pinHash'];
      return copy;
    });
  }
  return data;
}

@Injectable()
export class PosCashiersService {
  constructor(
    private readonly posCashiersRepository: PosCashiersRepository,
    @InjectRepository(PosCashier)
    private readonly cashierRepo: Repository<PosCashier>,
  ) {}

  async create(
    _tenantId: string,
    dto: CreateCashierDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const pinHash = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);

    const cashier = await this.posCashiersRepository.create({
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
      createdBy: auditContext.userId ?? null,
    });

    return excludePinHash(cashier);
  }

  async findAll(_tenantId: string, pagination: PaginationDto) {
    const result = await this.posCashiersRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
    });

    return excludePinHashFromList(result as unknown as Record<string, unknown>);
  }

  async findById(_tenantId: string, id: string) {
    const cashier = await this.posCashiersRepository.findById(id);
    return excludePinHash(cashier);
  }

  async update(
    _tenantId: string,
    id: string,
    dto: UpdateCashierDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const updateData: Record<string, unknown> = {
      updatedBy: auditContext.userId ?? null,
    };

    if (dto.displayName !== undefined) updateData['displayName'] = dto.displayName;
    if (dto.isActive !== undefined) updateData['isActive'] = dto.isActive;
    if (dto.maxDiscountPct !== undefined) updateData['maxDiscountPct'] = dto.maxDiscountPct;
    if (dto.canRefund !== undefined) updateData['canRefund'] = dto.canRefund;
    if (dto.canVoid !== undefined) updateData['canVoid'] = dto.canVoid;
    if (dto.canOpenDrawer !== undefined) updateData['canOpenDrawer'] = dto.canOpenDrawer;

    const cashier = await this.posCashiersRepository.update(id, updateData as Partial<PosCashier>);
    return excludePinHash(cashier);
  }

  async softDelete(
    _tenantId: string,
    id: string,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    await this.posCashiersRepository.softDelete(id);
  }

  async setPin(
    _tenantId: string,
    id: string,
    dto: SetPinDto,
    auditContext: { userId?: string; tenantId?: string },
  ) {
    const pinHash = await bcrypt.hash(dto.pin, BCRYPT_ROUNDS);

    const cashier = await this.posCashiersRepository.update(id, {
      pinHash,
      failedPinAttempts: 0,
      lockedUntil: null,
      updatedBy: auditContext.userId ?? null,
    });

    return excludePinHash(cashier);
  }

  async authenticatePin(_tenantId: string, dto: AuthenticatePinDto) {
    const cashier = await this.posCashiersRepository.findOne({
      userId: dto.userId,
      isActive: true,
    });

    if (!cashier) {
      throw new NotFoundException(msg(ErrorMessages.CASHIER_NOT_FOUND, dto.userId));
    }

    if (cashier.lockedUntil && new Date(cashier.lockedUntil) > new Date()) {
      throw new BadRequestException(
        msg(ErrorMessages.ACCOUNT_LOCKED, new Date(cashier.lockedUntil).toISOString()),
      );
    }

    const isValid = await bcrypt.compare(dto.pin, cashier.pinHash);

    if (!isValid) {
      // Atomically increment failed attempts using TypeORM query builder
      const newAttempts = (cashier.failedPinAttempts ?? 0) + 1;
      const lockedUntil =
        newAttempts >= MAX_PIN_ATTEMPTS
          ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await this.cashierRepo
        .createQueryBuilder()
        .update(PosCashier)
        .set({ failedPinAttempts: newAttempts, lockedUntil })
        .where('id = :id', { id: cashier.id })
        .execute();

      throw new BadRequestException(msg(ErrorMessages.INVALID_PIN, MAX_PIN_ATTEMPTS - newAttempts));
    }

    // Reset failed attempts on successful auth
    await this.posCashiersRepository.update(cashier.id, {
      failedPinAttempts: 0,
      lockedUntil: null,
    });

    return excludePinHash(cashier);
  }

  async authenticateManagerPin(_tenantId: string, managerUserId: string, pin: string) {
    const manager = await this.posCashiersRepository.findOne({
      userId: managerUserId,
      isActive: true,
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
      const newAttempts = (manager.failedPinAttempts ?? 0) + 1;
      const lockedUntil =
        newAttempts >= MAX_PIN_ATTEMPTS
          ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000)
          : null;

      await this.cashierRepo
        .createQueryBuilder()
        .update(PosCashier)
        .set({ failedPinAttempts: newAttempts, lockedUntil })
        .where('id = :id', { id: manager.id })
        .execute();

      throw new BadRequestException(
        msg(ErrorMessages.INVALID_MANAGER_PIN, MAX_PIN_ATTEMPTS - newAttempts),
      );
    }

    // Reset failed attempts
    await this.posCashiersRepository.update(manager.id, {
      failedPinAttempts: 0,
      lockedUntil: null,
    });

    return manager;
  }
}
