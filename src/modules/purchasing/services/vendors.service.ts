import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { VendorsRepository } from '@/database/sql/repositories/vendors.repository';
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

  async findAll(tenantId: string, query: PaginationDto) {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const offset = (page - 1) * limit;

    const { rows, total } = await this.vendorsRepository.findAllPaginated(tenantId, {
      limit,
      offset,
      search: query.search,
      sortOrder: query.sortOrder || 'ASC',
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
    return this.vendorsRepository.findOneById(tenantId, id);
  }

  async create(tenantId: string, dto: CreateVendorDto, auditContext: AuditContext) {
    if (dto.email) {
      const exists = await this.vendorsRepository.existsByEmailTenant(tenantId, dto.email);
      if (exists) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

    const id = await this.vendorsRepository.insertVendor(tenantId, {
      name: dto.nameEn,
      email: dto.email || null,
      phone: dto.phone || null,
      address: dto.address || null,
      taxNumber: dto.vatNumber || null,
      notes: dto.notes || null,
      createdBy: auditContext.userId || null,
    });

    const vendor = await this.vendorsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'purchasing.vendors',
      id,
      vendor,
      auditContext.userId,
    );

    return vendor;
  }

  async update(tenantId: string, id: string, dto: UpdateVendorDto, auditContext: AuditContext) {
    const existing = await this.vendorsRepository.findOneById(tenantId, id);
    const before = { ...existing };

    if (dto.email && dto.email !== existing.email) {
      const exists = await this.vendorsRepository.existsByEmailTenant(tenantId, dto.email, id);
      if (exists) {
        throw new ConflictException('A vendor with this email already exists');
      }
    }

    const updates: string[] = [];
    const replacements: Record<string, unknown> = { id };

    if (dto.nameEn !== undefined) {
      updates.push('name = :name');
      replacements.name = dto.nameEn;
    }
    if (dto.nameAr !== undefined) {
      updates.push('name = :name');
      replacements.name = dto.nameAr;
    }
    if (dto.email !== undefined) {
      updates.push('email = :email');
      replacements.email = dto.email;
    }
    if (dto.phone !== undefined) {
      updates.push('phone = :phone');
      replacements.phone = dto.phone;
    }
    if (dto.address !== undefined) {
      updates.push('address = :address');
      replacements.address = dto.address;
    }
    if (dto.vatNumber !== undefined) {
      updates.push('"taxNumber" = :taxNumber');
      replacements.taxNumber = dto.vatNumber;
    }
    if (dto.notes !== undefined) {
      updates.push('notes = :notes');
      replacements.notes = dto.notes;
    }

    updates.push('"updatedBy" = :updatedBy');
    replacements.updatedBy = auditContext.userId || null;
    updates.push('"updatedAt" = NOW()');

    await this.vendorsRepository.updateVendor(tenantId, id, updates, replacements);

    const updated = await this.vendorsRepository.findOneById(tenantId, id);

    await this.auditService.logUpdate(
      tenantId,
      'purchasing.vendors',
      id,
      before,
      updated,
      auditContext.userId,
    );

    return updated;
  }

  async remove(tenantId: string, id: string, auditContext: AuditContext) {
    const existing = await this.vendorsRepository.findOneById(tenantId, id);

    await this.vendorsRepository.softDeleteVendor(tenantId, id, auditContext.userId || null);

    await this.auditService.logDelete(
      tenantId,
      'purchasing.vendors',
      id,
      existing,
      auditContext.userId,
    );
  }

  async getDropdown(tenantId: string, query: DropdownQueryDto) {
    const rows = await this.vendorsRepository.findDropdown(tenantId, {
      search: query.search,
      limit: query.limit || 100,
    });

    return rows;
  }
}
