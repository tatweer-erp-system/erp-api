import { Injectable } from '@nestjs/common';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ComboGroupsRepository {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {}

  async findByComboId(tenantId: string, comboId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM combo_groups WHERE "deletedAt" IS NULL AND "tenantId" = :tenantId AND "comboId" = :comboId ORDER BY sequence ASC`,
      { replacements: { tenantId, comboId } },
    );
    return rows as unknown as any[];
  }

  async findById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM combo_groups WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async create(
    tenantId: string,
    data: {
      comboId: string;
      nameEn: string;
      nameAr: string;
      sequence: number;
      isRequired: boolean;
      createdBy: string | null;
    },
    transaction?: any,
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO combo_groups (id, "tenantId", "comboId", "nameEn", "nameAr", sequence, "isRequired", "createdBy", "updatedBy", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :comboId, :nameEn, :nameAr, :sequence, :isRequired, :createdBy, :createdBy, NOW(), NOW())`,
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
      `UPDATE combo_groups SET ${updates.join(', ')} WHERE id = :id AND "tenantId" = :tenantId AND "deletedAt" IS NULL`,
      {
        replacements: { ...replacements, id, tenantId },
        transaction,
      } as any,
    );
  }

  async softDelete(tenantId: string, id: string, updatedBy: string | null) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE combo_groups SET "deletedAt" = NOW(), "updatedBy" = :updatedBy WHERE id = :id AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }
}
