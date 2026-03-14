import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RolesRepository } from '@/database/sql/repositories/roles.repository';
import { PermissionCacheSharedService } from '@/shared/services/permission-cache-shared.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateTenantRoleDto, UpdateTenantRoleDto } from '../dto/tenant-role.dto';

@Injectable()
export class TenantRolesService {
  private readonly logger = new Logger(TenantRolesService.name);

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionCacheService: PermissionCacheSharedService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';

    const { rows, total } = await this.rolesRepository.findAllPaginated(tenantId, {
      page,
      limit,
      search: query.search,
      sortColumn,
      sortOrder,
    });

    // Enrich each role with userCount
    const items = await Promise.all(
      (rows as any[]).map(async (role: any) => {
        const userIds = await this.rolesRepository.findUserIdsByRoleId(tenantId, role.id);
        return {
          ...role,
          userCount: userIds.length,
        };
      }),
    );

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(tenantId: string, id: string) {
    const role = await this.rolesRepository.findByIdWithPermissions(tenantId, id);
    if (!role) throw new NotFoundException('Role not found');

    const userIds = await this.rolesRepository.findUserIdsByRoleId(tenantId, id);

    return {
      ...role,
      userCount: userIds.length,
    };
  }

  async create(tenantId: string, dto: CreateTenantRoleDto, auditUserId?: string) {
    // Check name uniqueness
    const nameExists = await this.rolesRepository.existsByNameExcludingId(tenantId, dto.nameEn);
    if (nameExists) {
      throw new ConflictException('Role name already exists');
    }

    const id = await this.rolesRepository.createRole(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionAr: dto.descriptionAr ?? null,
      createdBy: auditUserId ?? null,
    });

    // Assign permissions if provided
    if (dto.permissions && dto.permissions.length > 0) {
      await this.rolesRepository.assignPermissions(tenantId, id, dto.permissions);
    }

    this.logger.log(`Role '${dto.nameEn}' created in tenant ${tenantId} by backoffice`);
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateTenantRoleDto, auditUserId?: string) {
    const role = await this.findById(tenantId, id);

    // Prevent updating system roles' names
    if (role.isSystem && (dto.nameEn !== undefined || dto.nameAr !== undefined)) {
      throw new BadRequestException('System role names cannot be modified');
    }

    const updates: string[] = ['"updatedAt" = NOW()'];
    const replacements: Record<string, unknown> = { id };

    if (auditUserId) {
      updates.push('"updatedBy" = :updatedBy');
      replacements.updatedBy = auditUserId;
    }

    if (dto.nameEn !== undefined) {
      const nameExists = await this.rolesRepository.existsByNameExcludingId(
        tenantId,
        dto.nameEn,
        id,
      );
      if (nameExists) {
        throw new ConflictException('Role name already exists');
      }
      updates.push('"nameEn" = :nameEn');
      replacements.nameEn = dto.nameEn;
    }

    if (dto.nameAr !== undefined) {
      updates.push('"nameAr" = :nameAr');
      replacements.nameAr = dto.nameAr;
    }

    if (dto.descriptionEn !== undefined) {
      updates.push('"descriptionEn" = :descriptionEn');
      replacements.descriptionEn = dto.descriptionEn;
    }

    if (dto.descriptionAr !== undefined) {
      updates.push('"descriptionAr" = :descriptionAr');
      replacements.descriptionAr = dto.descriptionAr;
    }

    await this.rolesRepository.updateRole(tenantId, id, updates, replacements);

    // Update permissions if provided
    if (dto.permissions !== undefined) {
      await this.rolesRepository.assignPermissions(tenantId, id, dto.permissions);
      await this.permissionCacheService.invalidateRolePermissions(tenantId, id);
    }

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditUserId?: string) {
    const role = await this.findById(tenantId, id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.rolesRepository.softDeleteRole(tenantId, id, auditUserId ?? null);
  }

  async duplicate(tenantId: string, id: string, auditUserId?: string) {
    const role = await this.findById(tenantId, id);

    // Generate a unique copy name
    let copyNameEn = `${role.nameEn} (Copy)`;
    let copyNameAr = `${role.nameAr} (نسخة)`;
    let counter = 1;
    while (await this.rolesRepository.existsByNameExcludingId(tenantId, copyNameEn)) {
      counter++;
      copyNameEn = `${role.nameEn} (Copy ${counter})`;
      copyNameAr = `${role.nameAr} (نسخة ${counter})`;
    }

    const newId = await this.rolesRepository.createRole(tenantId, {
      nameEn: copyNameEn,
      nameAr: copyNameAr,
      descriptionEn: role.descriptionEn ?? null,
      descriptionAr: role.descriptionAr ?? null,
      createdBy: auditUserId ?? null,
    });

    // Copy permissions from original role
    const permissions = role.permissions || [];
    if (permissions.length > 0) {
      const permissionIds = permissions.map((p: any) => p.id);
      await this.rolesRepository.assignPermissions(tenantId, newId, permissionIds);
    }

    this.logger.log(`Role '${role.nameEn}' duplicated as '${copyNameEn}' in tenant ${tenantId}`);
    return this.findById(tenantId, newId);
  }
}
