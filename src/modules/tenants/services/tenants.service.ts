import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { TenantsRepository } from '@/database/sql/repositories/tenants.repository';
import { TenantProvisionerService } from './tenant-provisioner.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { TenantStatus } from '@/common/enums/status.enum';
import { AuditContext } from '@/common/interfaces/repository.interface';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly tenantProvisionerService: TenantProvisionerService,
  ) {}

  async findAll(query: PaginationDto) {
    return this.tenantsRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ['nameEn', 'nameAr'],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  async findById(id: string) {
    return this.tenantsRepository.findById(id);
  }

  async findBySlug(slug: string) {
    const tenant = await this.tenantsRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }
    return tenant;
  }

  async create(dto: CreateTenantDto, auditContext?: AuditContext) {
    const slugExists = await this.tenantsRepository.existsBySlug(dto.slug);
    if (slugExists) {
      throw new ConflictException(`Tenant slug '${dto.slug}' already exists`);
    }

    const result = await this.tenantProvisionerService.provision(dto);
    this.logger.log(`Tenant '${dto.slug}' provisioned by user ${auditContext?.userId}`);
    return result;
  }

  async update(id: string, dto: UpdateTenantDto, auditContext?: AuditContext) {
    const updateData: Record<string, unknown> = {};

    if (dto.nameEn !== undefined) {
      updateData.nameEn = dto.nameEn;
    }

    if (dto.nameAr !== undefined) {
      updateData.nameAr = dto.nameAr;
    }

    if (dto.slug !== undefined) {
      const existing = await this.tenantsRepository.findBySlug(dto.slug);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Tenant slug '${dto.slug}' already exists`);
      }
      updateData.slug = dto.slug;
    }

    if (dto.phone !== undefined) {
      const settings = (await this.tenantsRepository.findById(id)).settings || {};
      updateData.settings = { ...settings, phone: dto.phone };
    }

    if (dto.domain !== undefined) {
      const settings = (await this.tenantsRepository.findById(id)).settings || {};
      updateData.settings = {
        ...((updateData.settings as Record<string, unknown>) || settings),
        domain: dto.domain,
      };
    }

    return this.tenantsRepository.update(id, updateData as any, { auditContext });
  }

  async remove(id: string, auditContext?: AuditContext) {
    await this.tenantsRepository.softDelete(id, { auditContext });
  }

  async suspend(id: string, auditContext?: AuditContext) {
    const tenant = await this.tenantsRepository.findById(id);
    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ConflictException('Tenant is already suspended');
    }

    return this.tenantsRepository.update(
      id,
      {
        status: TenantStatus.SUSPENDED,
        suspendedAt: new Date(),
      } as any,
      { auditContext },
    );
  }

  async activate(id: string, auditContext?: AuditContext) {
    const tenant = await this.tenantsRepository.findById(id);
    if (tenant.status === TenantStatus.ACTIVE) {
      throw new ConflictException('Tenant is already active');
    }

    return this.tenantsRepository.update(
      id,
      {
        status: TenantStatus.ACTIVE,
        suspendedAt: null,
        suspendReason: null,
      } as any,
      { auditContext },
    );
  }

  async getDropdown(query: DropdownQueryDto) {
    return this.tenantsRepository.getDropdown({
      search: query.search,
      limit: query.limit,
    });
  }
}
