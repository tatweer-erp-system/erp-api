import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../database/tenant-sequelize.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findAll(tenantSlug: string, pagination: PaginationDto) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const { limit = 20, offset = 0, search } = pagination;

    const whereClause = search
      ? `AND (email ILIKE :search OR first_name ILIKE :search OR last_name ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, email, first_name, last_name, phone, avatar_url, is_active, last_login_at, created_at
       FROM users WHERE deleted_at IS NULL ${whereClause}
       ORDER BY created_at DESC LIMIT :limit OFFSET :offset`,
      {
        replacements: { limit, offset, search: search ? `%${search}%` : '' },
        type: 'SELECT',
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL ${whereClause}`,
      { replacements: { search: search ? `%${search}%` : '' }, type: 'SELECT' } as any,
    );

    return {
      data: rows,
      meta: {
        page: pagination.page ?? 1,
        limit,
        total: parseInt((countResult as any[])[0]?.total ?? '0', 10),
        totalPages: Math.ceil(
          parseInt((countResult as any[])[0]?.total ?? '0', 10) / (limit as number),
        ),
      },
    };
  }

  async findOne(tenantSlug: string, id: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    const [rows] = await sequelize.query(
      `SELECT id, email, first_name, last_name, phone, avatar_url, is_active, last_login_at, created_at
       FROM users WHERE id = :id AND deleted_at IS NULL`,
      { replacements: { id }, type: 'SELECT' } as any,
    );
    const user = (rows as any[])[0];
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantSlug: string, dto: CreateUserDto, createdBy?: string) {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE email = :email AND deleted_at IS NULL`,
      { replacements: { email: dto.email }, type: 'SELECT' } as any,
    );
    if ((existing as any[]).length > 0) {
      throw new ConflictException('Email already registered');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(dto.password, 12);

    await sequelize.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, is_active, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :email, :passwordHash, :firstName, :lastName, :phone, true, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone ?? null,
          createdBy: createdBy ?? null,
        },
      } as any,
    );

    return this.findOne(tenantSlug, id);
  }

  async update(tenantSlug: string, id: string, dto: UpdateUserDto, updatedBy?: string) {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);

    const updates: string[] = ['updated_at = NOW()', 'updated_by = :updatedBy'];
    const replacements: Record<string, unknown> = { id, updatedBy: updatedBy ?? null };

    if (dto.firstName !== undefined) {
      updates.push('first_name = :firstName');
      replacements['firstName'] = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      updates.push('last_name = :lastName');
      replacements['lastName'] = dto.lastName;
    }
    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements['phone'] = dto.phone;
    }

    await sequelize.query(`UPDATE users SET ${updates.join(', ')} WHERE id = :id`, {
      replacements,
    } as any);

    return this.findOne(tenantSlug, id);
  }

  async remove(tenantSlug: string, id: string): Promise<void> {
    await this.findOne(tenantSlug, id);
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(`UPDATE users SET deleted_at = NOW() WHERE id = :id`, {
      replacements: { id },
    } as any);
  }

  async registerFcmToken(
    tenantSlug: string,
    userId: string,
    token: string,
    deviceType?: string,
    deviceId?: string,
  ): Promise<void> {
    const sequelize = await this.tenantSequelizeService.getSequelizeForTenant(tenantSlug);
    await sequelize.query(
      `INSERT INTO user_fcm_tokens (id, user_id, token, device_type, device_id, is_active, created_at, updated_at)
       VALUES (:id, :userId, :token, :deviceType, :deviceId, true, NOW(), NOW())
       ON CONFLICT (token) DO UPDATE SET is_active = true, updated_at = NOW()`,
      {
        replacements: {
          id: uuidv4(),
          userId,
          token,
          deviceType: deviceType ?? null,
          deviceId: deviceId ?? null,
        },
      } as any,
    );
  }
}
