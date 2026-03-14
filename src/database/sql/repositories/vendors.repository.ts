import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Vendor } from '../entities/vendor.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VendorsRepository extends BaseRepository<Vendor> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Vendor, true);
  }

  async findByEmail(email: string, tenantId: string): Promise<Vendor | null> {
    return this.findOne({
      where: { email },
      tenantId,
    });
  }

  async existsByEmail(email: string, tenantId: string): Promise<boolean> {
    const vendor = await this.findByEmail(email, tenantId);
    return vendor !== null;
  }

  // ── Raw SQL tenant-aware methods ──────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search OR email ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM vendors WHERE "isActive" = true AND "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" ${sortOrder} LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM vendors WHERE "isActive" = true AND "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM vendors WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertVendor(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      email?: string | null;
      phone?: string | null;
      address?: string | null;
      taxNumber?: string | null;
      vatNumber?: string | null;
      crNumber?: string | null;
      currencyId?: string | null;
      paymentTermsDays?: number;
      bankName?: string | null;
      bankIban?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO vendors (id, "tenantId", "nameEn", "nameAr", email, phone, address, "taxNumber", "vatNumber", "crNumber", "currencyId", "paymentTermsDays", "bankName", "bankIban", "isActive", notes, "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :email, :phone, :address, :taxNumber, :vatNumber, :crNumber, :currencyId, :paymentTermsDays, :bankName, :bankIban, true, :notes, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          email: data.email ?? null,
          phone: data.phone ?? null,
          address: data.address ?? null,
          taxNumber: data.taxNumber ?? null,
          vatNumber: data.vatNumber ?? null,
          crNumber: data.crNumber ?? null,
          currencyId: data.currencyId ?? null,
          paymentTermsDays: data.paymentTermsDays ?? 30,
          bankName: data.bankName ?? null,
          bankIban: data.bankIban ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateVendor(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE vendors SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteVendor(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE vendors SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async existsByEmailTenant(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const excludeClause = excludeId ? ` AND id != :excludeId` : '';
    const [existing] = await sequelize.query(
      `SELECT id FROM vendors WHERE email = :email AND "deletedAt" IS NULL AND "tenantId" = :tenantId${excludeClause}`,
      {
        replacements: { email, tenantId, excludeId: excludeId ?? null },
      } as any,
    );
    return (existing as unknown as any[]).length > 0;
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search ? `AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)` : '';

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr" FROM vendors WHERE "isActive" = true AND "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
