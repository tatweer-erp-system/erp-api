import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { UsersRepository } from '@/database/sql/repositories/users.repository';
import { AuthRepository } from '@/database/sql/repositories/auth.repository';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  CreateTenantUserDto,
  UpdateTenantUserDto,
  PermissionOverrideDto,
} from '../dto/tenant-user.dto';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';

@Injectable()
export class TenantUsersService {
  private readonly logger = new Logger(TenantUsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authRepository: AuthRepository,
    private readonly tenantSequelizeService: TenantSequelizeService,
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

  async create(tenantId: string, dto: CreateTenantUserDto, auditUserId?: string) {
    // Check email uniqueness
    const emailExists = await this.usersRepository.existsByEmail(tenantId, dto.email);
    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.usersRepository.create({
      id,
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
      createdBy: auditUserId ?? null,
    } as any);

    // Set active status if provided
    if (dto.isActive !== undefined && !dto.isActive) {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      await sequelize.query(
        `UPDATE users SET "isActive" = :isActive WHERE id = :id AND "tenantId" = :tenantId`,
        { replacements: { isActive: dto.isActive, id, tenantId } },
      );
    }

    // Assign roles if provided
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.usersRepository.assignRoles(tenantId, id, dto.roleIds);
    }

    this.logger.log(`User ${dto.email} created in tenant ${tenantId} by backoffice`);
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateTenantUserDto, auditUserId?: string) {
    await this.findById(tenantId, id);

    if (dto.email !== undefined) {
      const emailExists = await this.usersRepository.existsByEmail(tenantId, dto.email, id);
      if (emailExists) {
        throw new ConflictException('Email already registered');
      }
    }

    await this.usersRepository.update(tenantId, id, {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      updatedBy: auditUserId ?? null,
    });

    // Update active status if provided
    if (dto.isActive !== undefined) {
      const sequelize = this.tenantSequelizeService.getSharedSequelize();
      await sequelize.query(
        `UPDATE users SET "isActive" = :isActive, "updatedAt" = NOW() WHERE id = :id AND "tenantId" = :tenantId`,
        { replacements: { isActive: dto.isActive, id, tenantId } },
      );
    }

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.usersRepository.assignRoles(tenantId, id, dto.roleIds);
    }

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditUserId?: string) {
    await this.findById(tenantId, id);
    await this.usersRepository.softDelete(tenantId, id, auditUserId ?? null);
  }

  async resetPassword(tenantId: string, userId: string) {
    await this.findById(tenantId, userId);

    // Generate a random temporary password
    const tempPassword = crypto.randomBytes(12).toString('base64url').slice(0, 16);
    const hash = await bcrypt.hash(tempPassword, 12);

    await this.usersRepository.updatePasswordHash(tenantId, userId, hash);

    // Revoke all sessions so user must re-login
    await this.authRepository.revokeAllUserTokens(tenantId, userId);

    this.logger.log(`Password reset for user ${userId} in tenant ${tenantId} by backoffice`);

    return { temporaryPassword: tempPassword };
  }

  async forceLogout(tenantId: string, userId: string) {
    await this.findById(tenantId, userId);

    await this.authRepository.revokeAllUserTokens(tenantId, userId);

    this.logger.log(`Force logout for user ${userId} in tenant ${tenantId} by backoffice`);

    return { message: 'All user sessions have been revoked' };
  }

  async addPermissionOverride(tenantId: string, userId: string, dto: PermissionOverrideDto) {
    const user = await this.findById(tenantId, userId);
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    const extraPermissions: string[] = user.extraPermissions || [];
    const revokedPermissions: string[] = user.revokedPermissions || [];

    if (dto.type === 'grant') {
      if (!extraPermissions.includes(dto.permission)) {
        extraPermissions.push(dto.permission);
      }
      // Remove from revoked if it was there
      const revokedIndex = revokedPermissions.indexOf(dto.permission);
      if (revokedIndex > -1) {
        revokedPermissions.splice(revokedIndex, 1);
      }
    } else {
      if (!revokedPermissions.includes(dto.permission)) {
        revokedPermissions.push(dto.permission);
      }
      // Remove from extra if it was there
      const extraIndex = extraPermissions.indexOf(dto.permission);
      if (extraIndex > -1) {
        extraPermissions.splice(extraIndex, 1);
      }
    }

    await sequelize.query(
      `UPDATE users SET "extraPermissions" = :extra, "revokedPermissions" = :revoked, "updatedAt" = NOW()
       WHERE id = :userId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: {
          extra: JSON.stringify(extraPermissions),
          revoked: JSON.stringify(revokedPermissions),
          userId,
          tenantId,
        },
      },
    );

    const overrideId = `${dto.type}:${dto.permission}`;

    return {
      id: overrideId,
      permission: dto.permission,
      type: dto.type,
    };
  }

  async removePermissionOverride(tenantId: string, userId: string, overrideId: string) {
    const user = await this.findById(tenantId, userId);
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // overrideId format: "grant:module:action" or "revoke:module:action"
    const colonIndex = overrideId.indexOf(':');
    if (colonIndex === -1) {
      throw new BadRequestException('Invalid override ID format');
    }

    const type = overrideId.slice(0, colonIndex);
    const permission = overrideId.slice(colonIndex + 1);

    const extraPermissions: string[] = [...(user.extraPermissions || [])];
    const revokedPermissions: string[] = [...(user.revokedPermissions || [])];

    if (type === 'grant') {
      const index = extraPermissions.indexOf(permission);
      if (index === -1) {
        throw new NotFoundException('Permission override not found');
      }
      extraPermissions.splice(index, 1);
    } else if (type === 'revoke') {
      const index = revokedPermissions.indexOf(permission);
      if (index === -1) {
        throw new NotFoundException('Permission override not found');
      }
      revokedPermissions.splice(index, 1);
    } else {
      throw new BadRequestException('Invalid override type');
    }

    await sequelize.query(
      `UPDATE users SET "extraPermissions" = :extra, "revokedPermissions" = :revoked, "updatedAt" = NOW()
       WHERE id = :userId AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: {
          extra: JSON.stringify(extraPermissions),
          revoked: JSON.stringify(revokedPermissions),
          userId,
          tenantId,
        },
      },
    );
  }
}
