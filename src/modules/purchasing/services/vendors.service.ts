import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { VendorsRepository } from '@/database/repositories/vendors.repository';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorDto } from '../dto/update-vendor.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { DropdownQueryDto } from '@/common/dto/dropdown-query.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    private readonly vendorsRepository: VendorsRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findAll(tenantSlug: string, query: PaginationDto) {
    return this.vendorsRepository.findAll({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: [],
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      where: { isActive: true },
    });
  }

  async findById(tenantSlug: string, id: string) {
    return this.vendorsRepository.findById(id);
  }

  async create(tenantSlug: string, dto: CreateVendorDto, auditContext: AuditContext) {
    if (dto.email) {
      const exists = await this.vendorsRepository.existsByEmail(dto.email);
      if (exists) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

    const vendor = await this.vendorsRepository.create(
      {
        name: dto.name_en,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address || null,
        taxNumber: dto.vatNumber || null,
        notes: dto.notes || null,
        isActive: true,
      } as any,
      { auditContext },
    );

    await this.auditService.logCreate(
      tenantSlug,
      'purchasing.vendors',
      vendor.id,
      vendor.toJSON(),
      auditContext.userId,
    );

    return vendor;
  }

  async update(tenantSlug: string, id: string, dto: UpdateVendorDto, auditContext: AuditContext) {
    const existing = await this.vendorsRepository.findById(id);
    const before = existing.toJSON();

    if (dto.email && dto.email !== existing.email) {
      const exists = await this.vendorsRepository.existsByEmail(dto.email);
      if (exists) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name_en !== undefined) updateData.name = dto.name_en;
    if (dto.name_ar !== undefined) updateData.name = dto.name_ar; // fallback; entity has single name
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.vatNumber !== undefined) updateData.taxNumber = dto.vatNumber;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.vendorsRepository.update(id, updateData as any, { auditContext });

    await this.auditService.logUpdate(
      tenantSlug,
      'purchasing.vendors',
      id,
      before,
      updated.toJSON(),
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantSlug: string, id: string, auditContext: AuditContext) {
    const existing = await this.vendorsRepository.findById(id);

    await this.vendorsRepository.softDelete(id, { auditContext });

    await this.auditService.logDelete(
      tenantSlug,
      'purchasing.vendors',
      id,
      existing.toJSON(),
      auditContext.userId,
    );
  }

  async getDropdown(tenantSlug: string, query: DropdownQueryDto) {
    const vendors = await this.vendorsRepository.findAllRaw({
      where: { isActive: true },
      attributes: ['id', 'name'],
    });

    let results = vendors.map((v) => ({
      id: v.id,
      name: v.name,
    }));

    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter((v) => v.name.toLowerCase().includes(search));
    }

    return results.slice(0, query.limit || 100);
  }
}
