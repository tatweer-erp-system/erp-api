import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminsRepository } from '@/database/sql/repositories/admins.repository';
import { JwtSharedService } from '@/shared/services/jwt-shared.service';
import { TokenCacheSharedService } from '@/shared/services/token-cache-shared.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { UpdateAdminDto } from '../dto/update-admin.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { Admin } from '@/database/sql/entities/admin.entity';
import { PaginatedResult } from '@/common/interfaces/pagination.interface';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AdminsService {
  private readonly logger = new Logger(AdminsService.name);

  constructor(
    private readonly adminsRepository: AdminsRepository,
    private readonly jwtSharedService: JwtSharedService,
    private readonly tokenCacheService: TokenCacheSharedService,
  ) {}

  async login(
    dto: AdminLoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    admin: { id: string; email: string; firstName: string; lastName: string };
  }> {
    const admin = await this.adminsRepository.findByEmail(dto.email);

    if (!admin) {
      throw new UnauthorizedException('ADMIN.INVALID_CREDENTIALS');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('ADMIN.ACCOUNT_DISABLED');
    }

    const passwordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('ADMIN.INVALID_CREDENTIALS');
    }

    // Update last login
    await this.adminsRepository.update(admin.id, {
      lastLoginAt: new Date(),
    } as Partial<Admin>);

    const payload = {
      sub: admin.id,
      email: admin.email,
      tenantSlug: 'public',
      roles: ['platform_admin'],
    };

    const accessToken = this.jwtSharedService.signAccessToken(payload);

    this.logger.log(`Admin login: ${admin.email} from IP ${ip}`);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  async logout(adminId: string): Promise<void> {
    await this.tokenCacheService.revokeAllUserTokens(adminId);
    this.logger.log(`Admin logout: ${adminId}`);
  }

  async findAll(query: PaginationDto): Promise<PaginatedResult<Admin>> {
    const result = await this.adminsRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return {
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  async findById(id: string): Promise<Admin> {
    return this.adminsRepository.findById(id);
  }

  async create(dto: CreateAdminDto, auditContext?: { userId: string }): Promise<Admin> {
    // Check for duplicate email
    const existing = await this.adminsRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('ADMIN.EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.adminsRepository.create(
      {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        isActive: true,
      } as Partial<Admin>,
      { auditContext },
    );
  }

  async update(id: string, dto: UpdateAdminDto, auditContext?: { userId: string }): Promise<Admin> {
    // Check email uniqueness if being updated
    if (dto.email) {
      const existing = await this.adminsRepository.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('ADMIN.EMAIL_ALREADY_EXISTS');
      }
    }

    const updateData: Partial<Admin> = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.adminsRepository.update(id, updateData as Partial<Admin>, {
      auditContext,
    });
  }

  async remove(id: string, auditContext?: { userId: string }): Promise<void> {
    await this.adminsRepository.softDelete(id, { auditContext });
  }
}
