import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class ComboGroupItemsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByGroupId(tenantId: string, groupId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT cgi.*, p."nameEn" AS "productNameEn", p."nameAr" AS "productNameAr", p."unitPrice"
       FROM combo_group_items cgi
       JOIN products p ON p.id = cgi."productId"
       WHERE cgi."deletedAt" IS NULL AND cgi."tenantId" = :tenantId AND cgi."groupId" = :groupId
       ORDER BY cgi.sequence ASC`,
      { replacements: { tenantId, groupId } },
    );
    return rows as unknown as any[];
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM combo_group_items WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      groupId: string;
      productId: string;
      extraPrice: number;
      sequence: number;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO combo_group_items (id, "tenantId", "groupId", "productId", "extraPrice", sequence, "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :groupId, :productId, :extraPrice, :sequence, :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: { id, tenantId, ...data },
        transaction,
      } as any,
    );
    return id;
  }

  async update(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE combo_group_items SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: { ...replacements, id, tenantId },
        transaction,
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE combo_group_items SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }
}
