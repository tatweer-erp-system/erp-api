import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { DownPayment } from '../entities/down-payment.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { v7 as uuidv7 } from 'uuid';
import { Transaction } from 'sequelize';

@Injectable()
export class DownPaymentsRepository extends BaseRepository<DownPayment> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(DownPayment, true);
  }

  async findBySaleOrderId(tenantId: string, saleOrderId: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM down_payments WHERE "saleOrderId" = :saleOrderId AND "deletedAt" IS NULL AND "tenantId" = :tenantId ORDER BY "createdAt" DESC`,
      { replacements: { saleOrderId, tenantId } },
    );
    return rows as unknown as any[];
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM down_payments WHERE id = :id AND "deletedAt" IS NULL AND "tenantId" = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async insertDownPayment(
    tenantId: string,
    data: {
      branchId: string;
      saleOrderId: string;
      invoiceId?: string | null;
      type: string;
      value: number;
      amount: number;
      createdBy?: string | null;
    },
    transaction?: Transaction,
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv7();
    await sequelize.query(
      `INSERT INTO down_payments (id, "tenantId", "branchId", "saleOrderId", "invoiceId", type, value, amount, "isDeducted", "createdBy", "updatedBy", version, "createdAt", "updatedAt")
       VALUES (:id, :tenantId, :branchId, :saleOrderId, :invoiceId, :type, :value, :amount, false, :createdBy, :createdBy, 0, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          branchId: data.branchId,
          saleOrderId: data.saleOrderId,
          invoiceId: data.invoiceId ?? null,
          type: data.type,
          value: data.value,
          amount: data.amount,
          createdBy: data.createdBy ?? null,
        },
        transaction,
      } as any,
    );
    return id;
  }

  async markDeducted(
    tenantId: string,
    saleOrderId: string,
    updatedBy: string | null,
    transaction?: Transaction,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE down_payments SET "isDeducted" = true, "updatedBy" = :updatedBy, "updatedAt" = NOW()
       WHERE "tenantId" = :tenantId AND "saleOrderId" = :saleOrderId AND "isDeducted" = false AND "deletedAt" IS NULL`,
      {
        replacements: { tenantId, saleOrderId, updatedBy },
        transaction,
      } as any,
    );
  }

  async getUndeductedTotal(
    tenantId: string,
    saleOrderId: string,
    transaction?: Transaction,
  ): Promise<number> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM down_payments
       WHERE "tenantId" = :tenantId AND "saleOrderId" = :saleOrderId AND "isDeducted" = false AND "deletedAt" IS NULL`,
      {
        replacements: { tenantId, saleOrderId },
        transaction,
      },
    );
    return parseFloat((rows as unknown as any[])[0]?.total ?? '0');
  }
}
