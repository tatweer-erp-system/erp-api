import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RolesRepository } from '@/database/sql/repositories/roles.repository';
import { PermissionCacheService } from './permission-cache.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionCacheService: PermissionCacheService,
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

  async findById(tenantId: string, id: string) {
    const role = await this.rolesRepository.findByIdWithPermissions(tenantId, id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(tenantId: string, dto: CreateRoleDto, auditContext?: AuditContext) {
    // Check name uniqueness
    const nameExists = await this.rolesRepository.existsByNameExcludingId(tenantId, dto.nameEn);
    if (nameExists) {
      throw new ConflictException('Role name already exists');
    }

    const createdBy = auditContext?.userId ?? null;

    const id = await this.rolesRepository.createRole(tenantId, {
      nameEn: dto.nameEn,
      nameAr: dto.nameAr,
      descriptionEn: dto.descriptionEn ?? null,
      descriptionAr: dto.descriptionAr ?? null,
      createdBy,
    });

    // Assign permissions if provided
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      await this.rolesRepository.assignPermissions(tenantId, id, dto.permissionIds);
    }

    this.logger.log(`Role '${dto.nameEn}' created in tenant ${tenantId}`);
    return this.findById(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateRoleDto, auditContext?: AuditContext) {
    const role = await this.findById(tenantId, id);

    // Prevent updating system roles' names
    if (role.isSystem && (dto.nameEn !== undefined || dto.nameAr !== undefined)) {
      throw new BadRequestException('System role names cannot be modified');
    }

    const updates: string[] = ['"updatedAt" = NOW()'];
    const replacements: Record<string, unknown> = { id };

    if (auditContext?.userId) {
      updates.push('"updatedBy" = :updatedBy');
      replacements.updatedBy = auditContext.userId;
    }

    if (dto.nameEn !== undefined) {
      // Check name uniqueness within tenant
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
    if (dto.permissionIds !== undefined) {
      await this.rolesRepository.assignPermissions(tenantId, id, dto.permissionIds);
      await this.permissionCacheService.invalidateRolePermissions(tenantId, id);
    }

    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string, auditContext?: AuditContext) {
    const role = await this.findById(tenantId, id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    await this.rolesRepository.softDeleteRole(tenantId, id, auditContext?.userId ?? null);
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const limit = query.limit ?? 50;

    return this.rolesRepository.findForDropdown(tenantId, {
      limit,
      search: query.search,
    });
  }

  async assignPermissions(tenantId: string, roleId: string, permissionIds: string[]) {
    const role = await this.findById(tenantId, roleId);

    if (role.isSystem) {
      throw new BadRequestException('System role permissions cannot be modified');
    }

    await this.rolesRepository.assignPermissions(tenantId, roleId, permissionIds);
    await this.permissionCacheService.invalidateRolePermissions(tenantId, roleId);

    return this.findById(tenantId, roleId);
  }

  async getPermissions(tenantId: string, roleId: string) {
    await this.findById(tenantId, roleId);
    return this.rolesRepository.findPermissionsByRoleId(tenantId, roleId);
  }

  /**
   * Alias for getPermissions - returns all permissions for a role.
   */
  async getPermissionsForRole(tenantId: string, roleId: string) {
    return this.getPermissions(tenantId, roleId);
  }
}
