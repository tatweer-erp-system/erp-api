import { Injectable } from '@nestjs/common';
import { validate as isUUID } from 'uuid';
import { BaseRepository } from '../base.repository';
import { Partner } from '../entities/partner.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PartnersRepository extends BaseRepository<Partner> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Partner, true);
  }

  async findAllPaginated(
    tenantId: string,
    options: {
      limit: number;
      offset: number;
      search?: string;
      sortOrder: string;
      type?: string;
      isCustomer?: boolean;
      isSupplier?: boolean;
      isActive?: boolean;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const {
      limit,
      offset,
      search,
      sortOrder,
      type,
      isCustomer,
      isSupplier,
      isActive,
      dateFrom,
      dateTo,
    } = options;

    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit, offset };

    if (search) {
      whereClause += ` AND (p."nameEn" ILIKE :search OR p."nameAr" ILIKE :search OR p.email ILIKE :search OR p.phone ILIKE :search OR p."taxNumber" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (type) {
      whereClause += ` AND p.type = :type`;
      replacements.type = type;
    }
    if (isCustomer !== undefined) {
      whereClause += ` AND p."isCustomer" = :isCustomer`;
      replacements.isCustomer = isCustomer;
    }
    if (isSupplier !== undefined) {
      whereClause += ` AND p."isSupplier" = :isSupplier`;
      replacements.isSupplier = isSupplier;
    }
    if (isActive !== undefined) {
      whereClause += ` AND p."isActive" = :isActive`;
      replacements.isActive = isActive;
    }
    if (dateFrom) {
      whereClause += ` AND p."createdAt" >= :dateFrom`;
      replacements.dateFrom = dateFrom;
    }
    if (dateTo) {
      whereClause += ` AND p."createdAt" <= :dateTo`;
      replacements.dateTo = dateTo;
    }

    const [rows] = await sequelize.query(
      `SELECT p.*,
              CONCAT(cu."firstNameEn", ' ', cu."lastNameEn") as "createdByNameEn",
              CONCAT(cu."firstNameAr", ' ', cu."lastNameAr") as "createdByNameAr"
       FROM partners p
       LEFT JOIN users cu ON cu.id = p."createdBy"
       WHERE p."deletedAt" IS NULL AND p."tenantId" = :tenantId ${whereClause}
       ORDER BY p."nameEn" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM partners p WHERE p."deletedAt" IS NULL AND p."tenantId" = :tenantId ${whereClause}`,
      { replacements } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT p.*,
              CONCAT(cu."firstNameEn", ' ', cu."lastNameEn") as "createdByNameEn",
              CONCAT(cu."firstNameAr", ' ', cu."lastNameAr") as "createdByNameAr"
       FROM partners p
       LEFT JOIN users cu ON cu.id = p."createdBy"
       WHERE ${isUUID(id) ? 'p.id = :id' : 'p."nameEn" = :id'} AND p."deletedAt" IS NULL AND p."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findOneWithContacts(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [partnerRows] = await sequelize.query(
      `SELECT p.*,
              CONCAT(cu."firstNameEn", ' ', cu."lastNameEn") as "createdByNameEn",
              CONCAT(cu."firstNameAr", ' ', cu."lastNameAr") as "createdByNameAr",
              CONCAT(uu."firstNameEn", ' ', uu."lastNameEn") as "updatedByNameEn",
              CONCAT(uu."firstNameAr", ' ', uu."lastNameAr") as "updatedByNameAr"
       FROM partners p
       LEFT JOIN users cu ON cu.id = p."createdBy"
       LEFT JOIN users uu ON uu.id = p."updatedBy"
       WHERE ${isUUID(id) ? 'p.id = :id' : 'p."nameEn" = :id'} AND p."deletedAt" IS NULL AND p."tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    const partner = (partnerRows as unknown as any[])[0] ?? null;
    if (!partner) return null;

    const [contacts] = await sequelize.query(
      `SELECT * FROM partner_contacts WHERE "partnerId" = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId ORDER BY "isMain" DESC, "firstName" ASC`,
      { replacements: { id: partner.id, tenantId } },
    );
    partner.contacts = contacts;
    return partner;
  }

  async insertPartner(
    tenantId: string,
    data: {
      nameEn: string;
      nameAr: string;
      type: string;
      isCustomer: boolean;
      isSupplier: boolean;
      taxNumber?: string | null;
      vatNumber?: string | null;
      phone?: string | null;
      mobile?: string | null;
      email?: string | null;
      website?: string | null;
      street?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zip?: string | null;
      creditLimit?: number;
      paymentTermId?: string | null;
      pricelistId?: string | null;
      arAccountId?: string | null;
      apAccountId?: string | null;
      fiscalPositionId?: string | null;
      bankIban?: string | null;
      bankName?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO partners (id, "tenantId", "nameEn", "nameAr", type, "isCustomer", "isSupplier", "taxNumber", "vatNumber", phone, mobile, email, website, street, city, state, country, zip, "creditLimit", "paymentTermId", "pricelistId", "arAccountId", "apAccountId", "fiscalPositionId", "bankIban", "bankName", notes, "isActive", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :nameEn, :nameAr, :type, :isCustomer, :isSupplier, :taxNumber, :vatNumber, :phone, :mobile, :email, :website, :street, :city, :state, :country, :zip, :creditLimit, :paymentTermId, :pricelistId, :arAccountId, :apAccountId, :fiscalPositionId, :bankIban, :bankName, :notes, true, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          type: data.type,
          isCustomer: data.isCustomer,
          isSupplier: data.isSupplier,
          taxNumber: data.taxNumber ?? null,
          vatNumber: data.vatNumber ?? null,
          phone: data.phone ?? null,
          mobile: data.mobile ?? null,
          email: data.email ?? null,
          website: data.website ?? null,
          street: data.street ?? null,
          city: data.city ?? null,
          state: data.state ?? null,
          country: data.country ?? 'Saudi Arabia',
          zip: data.zip ?? null,
          creditLimit: data.creditLimit ?? 0,
          paymentTermId: data.paymentTermId ?? null,
          pricelistId: data.pricelistId ?? null,
          arAccountId: data.arAccountId ?? null,
          apAccountId: data.apAccountId ?? null,
          fiscalPositionId: data.fiscalPositionId ?? null,
          bankIban: data.bankIban ?? null,
          bankName: data.bankName ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updatePartner(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE partners SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeletePartner(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE partners SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async existsByEmailTenant(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const excludeClause = excludeId ? ` AND id != :excludeId` : '';
    const [existing] = await sequelize.query(
      `SELECT id FROM partners WHERE email = :email AND "deletedAt" IS NULL AND "tenantId" = :tenantId${excludeClause}`,
      {
        replacements: { email, tenantId, excludeId: excludeId ?? null },
      } as any,
    );
    return (existing as unknown as any[]).length > 0;
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number; type?: string }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit, type } = options;
    let whereClause = '';
    const replacements: Record<string, unknown> = { tenantId, limit };

    if (search) {
      whereClause += ` AND ("nameEn" ILIKE :search OR "nameAr" ILIKE :search)`;
      replacements.search = `%${search}%`;
    }
    if (type) {
      whereClause += ` AND type = :type`;
      replacements.type = type;
    }

    const [rows] = await sequelize.query(
      `SELECT id, "nameEn", "nameAr", type, "isCustomer", "isSupplier" FROM partners WHERE "isActive" = true AND "deletedAt" IS NULL AND "tenantId" = :tenantId ${whereClause} ORDER BY "nameEn" LIMIT :limit`,
      { replacements } as any,
    );
    return rows;
  }

  async getCustomerSummary(tenantId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT
         COUNT(*) AS "totalCustomers",
         COUNT(*) FILTER (WHERE "isActive" = true) AS "totalActive",
         COUNT(*) FILTER (WHERE "isActive" = false) AS "totalInactive"
       FROM partners
       WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "isCustomer" = true`,
      { replacements: { tenantId } } as any,
    );
    const row = (rows as unknown as any[])[0] ?? {};
    return {
      totalCustomers: parseInt(row.totalCustomers ?? '0', 10),
      totalActive: parseInt(row.totalActive ?? '0', 10),
      totalInactive: parseInt(row.totalInactive ?? '0', 10),
    };
  }
}
