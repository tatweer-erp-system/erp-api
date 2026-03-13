import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersRepository } from '@/database/sql/repositories/users.repository';
import { DataPrivacySharedService } from '@/shared/services/data-privacy-shared.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CreateConsentDto } from '../dto/consent.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { ConsentType } from '@/shared/interfaces/data-privacy.interface';
import { resolvePermissions } from '@/common/constants/permissions';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dataPrivacyService: DataPrivacySharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    return this.usersRepository.findAll(tenantId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(tenantId: string, id: string) {
    const user = await this.usersRepository.findById(tenantId, id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantId: string, dto: CreateUserDto, auditContext?: AuditContext) {
    // Check email uniqueness
    const emailExists = await this.usersRepository.existsByEmail(tenantId, dto.email);
    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const createdBy = auditContext?.userId ?? null;

    await this.usersRepository.create(tenantId, {
      id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstNameEn,
      lastName: dto.lastNameEn,
      phone: dto.phone ?? null,
      createdBy,
    });

    // Assign roles (required on create)
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.usersRepository.assignRoles(tenantId, id, dto.roleIds);
    }

    this.logger.log(`User ${dto.email} created in tenant ${tenantId}`);
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto, auditContext?: AuditContext) {
    const existing = await this.findById(tenantId, id);

    // Optimistic locking check
    if (dto.version !== undefined) {
      const currentVersion = (existing as any).version;
      if (currentVersion !== undefined && currentVersion !== dto.version) {
        throw new ConflictException(
          `Version conflict: expected ${dto.version}, but record is at version ${currentVersion}`,
        );
      }
    }

    if (dto.email !== undefined) {
      // Check email uniqueness
      const emailExists = await this.usersRepository.existsByEmail(tenantId, dto.email, id);
      if (emailExists) {
        throw new ConflictException('Email already registered');
      }
    }

    await this.usersRepository.update(tenantId, id, {
      email: dto.email,
      firstName: dto.firstNameEn,
      lastName: dto.lastNameEn,
      phone: dto.phone,
      updatedBy: auditContext?.userId ?? null,
      version: dto.version,
    });

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.usersRepository.assignRoles(tenantId, id, dto.roleIds);
    }

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext?: AuditContext) {
    await this.findById(tenantId, id);
    await this.usersRepository.softDelete(tenantId, id, auditContext?.userId ?? null);
  }

  async restore(tenantId: string, id: string, auditContext?: AuditContext) {
    const deletedUser = await this.usersRepository.findDeletedById(tenantId, id);
    if (!deletedUser) {
      throw new NotFoundException('Deleted user not found');
    }

    await this.usersRepository.restore(tenantId, id, auditContext?.userId ?? null);
    return this.findById(tenantId, id);
  }

  async changePassword(tenantId: string, id: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const user = await this.usersRepository.findWithPasswordHash(tenantId, id);
    if (!user) throw new NotFoundException('User not found');

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersRepository.updatePasswordHash(tenantId, id, newHash);

    return { message: 'Password changed successfully' };
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    return this.usersRepository.getDropdown(tenantId, {
      search: query.search,
      limit: query.limit,
    });
  }

  async assignRoles(tenantId: string, userId: string, roleIds: string[]) {
    await this.findById(tenantId, userId);
    await this.usersRepository.assignRoles(tenantId, userId, roleIds);
    return this.findById(tenantId, userId);
  }

  /**
   * Computes effective permissions for a user:
   * effectivePermissions = (all permissions from user's roles via rolePermissions)
   *                        + user.extraPermissions
   *                        - user.revokedPermissions
   */
  async getUserPermissions(tenantId: string, userId: string): Promise<string[]> {
    const rolePermissions = await this.usersRepository.getUserRolePermissions(tenantId, userId);
    const userOverrides = await this.usersRepository.getUserPermissionOverrides(tenantId, userId);

    return resolvePermissions(
      rolePermissions,
      userOverrides.extraPermissions,
      userOverrides.revokedPermissions,
    );
  }

  // ── PDPL Methods ──────────────────────────────────────────────────────────

  async exportMyData(tenantId: string, userId: string) {
    return this.dataPrivacyService.exportUserData(tenantId, userId);
  }

  async requestErasure(tenantId: string, userId: string, reason?: string) {
    // Check for existing pending request
    const hasPending = await this.usersRepository.findPendingErasureRequest(tenantId, userId);
    if (hasPending) {
      throw new ConflictException('An erasure request is already pending');
    }

    const id = await this.usersRepository.createErasureRequest(tenantId, userId, reason);

    this.logger.log(`Erasure request created for user ${userId} in tenant ${tenantId}`);

    return { id, status: 'pending', message: 'Erasure request submitted successfully' };
  }

  async getMyConsents(tenantId: string, userId: string) {
    return this.dataPrivacyService.getConsents(tenantId, userId);
  }

  async recordConsent(
    tenantId: string,
    userId: string,
    dto: CreateConsentDto,
    ip: string,
    userAgent: string,
  ) {
    await this.dataPrivacyService.recordConsent(tenantId, userId, {
      consentType: dto.consentType as ConsentType,
      granted: dto.granted,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Consent recorded successfully' };
  }

  async revokeConsent(tenantId: string, userId: string, consentType: string) {
    await this.dataPrivacyService.revokeConsent(tenantId, userId, consentType as ConsentType);

    return { message: 'Consent revoked successfully' };
  }
}
