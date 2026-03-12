import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RolesRepository } from '@/database/sql/repositories/roles.repository';
import { PermissionCacheService } from '@/modules/roles/services/permission-cache.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateTenantRoleDto, UpdateTenantRoleDto } from '../dto/tenant-role.dto';

@Injectable()
export class TenantRolesService {
  private readonly logger = new Logger(TenantRolesService.name);

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionCacheService: PermissionCacheService,
  ) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortColumn = query.sortBy ?? 'created_at';
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
    const nameExists = await this.rolesRepository.existsByNameExcludingId(tenantId, dto.name);
    if (nameExists) {
      throw new ConflictException('Role name already exists');
    }

    const id = await this.rolesRepository.createRole(tenantId, {
      name: dto.name,
      description: dto.description ?? null,
      createdBy: auditUserId ?? null,
    });

    // Assign permissions if provided
    if (dto.permissions && dto.permissions.length > 0) {
      await this.rolesRepository.assignPermissions(tenantId, id, dto.permissions);
    }

    this.logger.log(`Role '${dto.name}' created in tenant ${tenantId} by backoffice`);
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateTenantRoleDto, auditUserId?: string) {
    const role = await this.findById(tenantId, id);

    // Prevent updating system roles' names
    if (role.is_system && dto.name !== undefined) {
      throw new BadRequestException('System role names cannot be modified');
    }

    const updates: string[] = ['updated_at = NOW()'];
    const replacements: Record<string, unknown> = { id };

    if (auditUserId) {
      updates.push('updated_by = :updatedBy');
      replacements.updatedBy = auditUserId;
    }

    if (dto.name !== undefined) {
      const nameExists = await this.rolesRepository.existsByNameExcludingId(tenantId, dto.name, id);
      if (nameExists) {
        throw new ConflictException('Role name already exists');
      }
      updates.push('name = :name');
      replacements.name = dto.name;
    }

    if (dto.description !== undefined) {
      updates.push('description = :description');
      replacements.description = dto.description;
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

    if (role.is_system) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.rolesRepository.softDeleteRole(tenantId, id, auditUserId ?? null);
  }

  async duplicate(tenantId: string, id: string, auditUserId?: string) {
    const role = await this.findById(tenantId, id);

    // Generate a unique copy name
    let copyName = `${role.name} (Copy)`;
    let counter = 1;
    while (await this.rolesRepository.existsByNameExcludingId(tenantId, copyName)) {
      counter++;
      copyName = `${role.name} (Copy ${counter})`;
    }

    const newId = await this.rolesRepository.createRole(tenantId, {
      name: copyName,
      description: role.description ?? null,
      createdBy: auditUserId ?? null,
    });

    // Copy permissions from original role
    const permissions = role.permissions || [];
    if (permissions.length > 0) {
      const permissionIds = permissions.map((p: any) => p.id);
      await this.rolesRepository.assignPermissions(tenantId, newId, permissionIds);
    }

    this.logger.log(`Role '${role.name}' duplicated as '${copyName}' in tenant ${tenantId}`);
    return this.findById(tenantId, newId);
  }
}
