import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { PartnerContact } from '../entities/partner-contact.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PartnerContactsRepository extends BaseRepository<PartnerContact> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(PartnerContact, true);
  }

  async findAllByPartnerId(
    tenantId: string,
    partnerId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;
    const replacements: Record<string, unknown> = { tenantId, partnerId, limit, offset };

    let whereClause = '';
    if (search) {
      whereClause += ` AND ("firstName" ILIKE :search OR "lastName" ILIKE :search OR email ILIKE :search OR phone ILIKE :search)`;
      replacements.search = `%${search}%`;
    }

    const [rows] = await sequelize.query(
      `SELECT * FROM partner_contacts WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "partnerId" = :partnerId ${whereClause} ORDER BY "isMain" DESC, "firstName" ${sortOrder} LIMIT :limit OFFSET :offset`,
      { replacements } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM partner_contacts WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "partnerId" = :partnerId ${whereClause}`,
      { replacements } as any,
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM partner_contacts WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertPartnerContact(
    tenantId: string,
    data: {
      partnerId: string;
      firstName: string;
      lastName?: string | null;
      phone?: string | null;
      mobile?: string | null;
      email?: string | null;
      position?: string | null;
      isMain?: boolean;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO partner_contacts (id, "tenantId", "partnerId", "firstName", "lastName", phone, mobile, email, position, "isMain", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :partnerId, :firstName, :lastName, :phone, :mobile, :email, :position, :isMain, :createdBy, :createdBy, 1, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          partnerId: data.partnerId,
          firstName: data.firstName,
          lastName: data.lastName ?? null,
          phone: data.phone ?? null,
          mobile: data.mobile ?? null,
          email: data.email ?? null,
          position: data.position ?? null,
          isMain: data.isMain ?? false,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updatePartnerContact(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE partner_contacts SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeletePartnerContact(
    tenantId: string,
    id: string,
    updatedBy: string | null,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE partner_contacts SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }
}
