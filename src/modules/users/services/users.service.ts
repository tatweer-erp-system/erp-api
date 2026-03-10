import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { DataPrivacySharedService } from '../../../shared/services/data-privacy.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CreateConsentDto } from '../dto/consent.dto';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { DropdownQueryDto } from '../../../common/dto/dropdown-query.dto';
import { AuditContext } from '../../../common/interfaces/repository.interface';
import { ConsentType } from '../../../shared/interfaces/data-privacy.interface';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly dataPrivacyService: DataPrivacySharedService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const searchClause = query.search
      ? `AND (email ILIKE :search OR first_name ILIKE :search OR last_name ILIKE :search)`
      : '';

    const sortColumn = query.sortBy ?? 'created_at';
    const sortOrder = query.sortOrder ?? 'DESC';

    const [rows] = await sequelize.query(
      `SELECT id, email, first_name, last_name, phone, avatar_url, preferred_lang,
              is_active, last_login_at, created_at, updated_at
       FROM users WHERE deleted_at IS NULL ${searchClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT :limit OFFSET :offset`,
      {
        replacements: {
          limit,
          offset,
          ...(query.search ? { search: `%${query.search}%` } : {}),
        },
      },
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*)::int as total FROM users WHERE deleted_at IS NULL ${searchClause}`,
      {
        replacements: query.search ? { search: `%${query.search}%` } : {},
      },
    );

    const total = (countResult as any[])[0]?.total ?? 0;

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
              u.preferred_lang, u.is_active, u.last_login_at, u.created_at, u.updated_at,
              COALESCE(
                json_agg(json_build_object('id', r.id, 'name', r.name))
                FILTER (WHERE r.id IS NOT NULL), '[]'
              ) as roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE u.id = :id AND u.deleted_at IS NULL
       GROUP BY u.id`,
      { replacements: { id } },
    );

    const user = (rows as any[])[0];
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantSlug: string, dto: CreateUserDto, auditContext?: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Check email uniqueness
    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
      { replacements: { email: dto.email } },
    );
    if ((existing as any[]).length > 0) {
      throw new ConflictException('Email already registered');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const createdBy = auditContext?.userId ?? null;

    await sequelize.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active,
                          created_by, updated_by, created_at, updated_at)
       VALUES (:id, :email, :passwordHash, :firstName, :lastName, :phone, true,
               :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName_en,
          lastName: dto.lastName_en,
          phone: dto.phone ?? null,
          createdBy,
        },
      },
    );

    // Assign roles if provided
    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.assignRolesInternal(sequelize, id, dto.roleIds);
    }

    this.logger.log(`User ${dto.email} created in tenant ${tenantSlug}`);
    return this.findById(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateUserDto, auditContext?: AuditContext) {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const updates: string[] = ['updated_at = NOW()'];
    const replacements: Record<string, unknown> = { id };

    if (auditContext?.userId) {
      updates.push('updated_by = :updatedBy');
      replacements.updatedBy = auditContext.userId;
    }

    if (dto.email !== undefined) {
      // Check email uniqueness
      const [existing] = await sequelize.query(
        `SELECT id FROM users WHERE email = :email AND id != :id AND deleted_at IS NULL`,
        { replacements: { email: dto.email, id } },
      );
      if ((existing as any[]).length > 0) {
        throw new ConflictException('Email already registered');
      }
      updates.push('email = :email');
      replacements.email = dto.email;
    }

    if (dto.firstName_en !== undefined) {
      updates.push('first_name = :firstName');
      replacements.firstName = dto.firstName_en;
    }

    if (dto.lastName_en !== undefined) {
      updates.push('last_name = :lastName');
      replacements.lastName = dto.lastName_en;
    }

    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = dto.phone;
    }

    await sequelize.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = :id AND deleted_at IS NULL`,
      { replacements },
    );

    // Update roles if provided
    if (dto.roleIds !== undefined) {
      await this.assignRolesInternal(sequelize, id, dto.roleIds);
    }

    return this.findById(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string, auditContext?: AuditContext) {
    await this.findById(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    await sequelize.query(
      `UPDATE users SET deleted_at = NOW(), updated_by = :updatedBy, updated_at = NOW()
       WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id, updatedBy: auditContext?.userId ?? null } },
    );
  }

  async restore(tenantSlug: string, id: string, auditContext?: AuditContext) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT id FROM users WHERE id = :id AND deleted_at IS NOT NULL`,
      { replacements: { id } },
    );
    if ((rows as any[]).length === 0) {
      throw new NotFoundException('Deleted user not found');
    }

    await sequelize.query(
      `UPDATE users SET deleted_at = NULL, updated_by = :updatedBy, updated_at = NOW()
       WHERE id = :id`,
      { replacements: { id, updatedBy: auditContext?.userId ?? null } },
    );

    return this.findById(tenantSlug, id);
  }

  async changePassword(tenantSlug: string, id: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [rows] = await sequelize.query(
      `SELECT id, password_hash FROM users WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id } },
    );
    const user = (rows as any[])[0];
    if (!user) throw new NotFoundException('User not found');

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 12);
    await sequelize.query(
      `UPDATE users SET password_hash = :hash, updated_at = NOW() WHERE id = :id`,
      { replacements: { id, hash: newHash } },
    );

    return { message: 'Password changed successfully' };
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const limit = query.limit ?? 50;

    const searchClause = query.search
      ? `AND (email ILIKE :search OR first_name ILIKE :search OR last_name ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, CONCAT(first_name, ' ', last_name) as name, email as code
       FROM users
       WHERE deleted_at IS NULL AND is_active = true
       ${searchClause}
       ORDER BY first_name ASC
       LIMIT :limit`,
      {
        replacements: {
          limit,
          ...(query.search ? { search: `%${query.search}%` } : {}),
        },
      },
    );

    return rows;
  }

  async assignRoles(tenantSlug: string, userId: string, roleIds: string[]) {
    await this.findById(tenantSlug, userId);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await this.assignRolesInternal(sequelize, userId, roleIds);
    return this.findById(tenantSlug, userId);
  }

  // ── PDPL Methods ──────────────────────────────────────────────────────────

  async exportMyData(tenantSlug: string, userId: string) {
    return this.dataPrivacyService.exportUserData(tenantSlug, userId);
  }

  async requestErasure(tenantSlug: string, userId: string, reason?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    // Check for existing pending request
    const [existing] = await sequelize.query(
      `SELECT id FROM erasure_requests WHERE user_id = :userId AND status = 'pending'`,
      { replacements: { userId } },
    );
    if ((existing as any[]).length > 0) {
      throw new ConflictException('An erasure request is already pending');
    }

    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO erasure_requests (id, user_id, requested_at, status, reason, created_at, updated_at)
       VALUES (:id, :userId, NOW(), 'pending', :reason, NOW(), NOW())`,
      { replacements: { id, userId, reason: reason ?? null } },
    );

    this.logger.log(`Erasure request created for user ${userId} in tenant ${tenantSlug}`);

    return { id, status: 'pending', message: 'Erasure request submitted successfully' };
  }

  async getMyConsents(tenantSlug: string, userId: string) {
    return this.dataPrivacyService.getConsents(tenantSlug, userId);
  }

  async recordConsent(
    tenantSlug: string,
    userId: string,
    dto: CreateConsentDto,
    ip: string,
    userAgent: string,
  ) {
    await this.dataPrivacyService.recordConsent(tenantSlug, userId, {
      consentType: dto.consentType as ConsentType,
      granted: dto.granted,
      ipAddress: ip,
      userAgent,
    });

    return { message: 'Consent recorded successfully' };
  }

  async revokeConsent(tenantSlug: string, userId: string, consentType: string) {
    await this.dataPrivacyService.revokeConsent(tenantSlug, userId, consentType as ConsentType);

    return { message: 'Consent revoked successfully' };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async assignRolesInternal(sequelize: any, userId: string, roleIds: string[]) {
    // Remove existing role assignments
    await sequelize.query(`DELETE FROM user_roles WHERE user_id = :userId`, {
      replacements: { userId },
    });

    // Insert new assignments
    for (const roleId of roleIds) {
      await sequelize.query(
        `INSERT INTO user_roles (id, user_id, role_id, created_at, updated_at)
         VALUES (:id, :userId, :roleId, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        { replacements: { id: uuidv4(), userId, roleId } },
      );
    }
  }
}
