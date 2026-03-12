import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../base.repository';
import { Contact } from '../entities/contact.entity';
import { TenantSequelizeService } from '../tenant-sequelize.service';
import { QueryOptions } from '../../../common/interfaces/repository.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ContactsRepository extends TenantAwareRepository<Contact> {
  constructor(private readonly tenantSequelizeService: TenantSequelizeService) {
    super(Contact);
  }

  async findByEmail(
    tenantId: string,
    email: string,
    options: QueryOptions & { tenantId: string },
  ): Promise<Contact | null> {
    return this.findOne({
      where: { email, ...options.where },
      transaction: options.transaction,
      tenantId,
    });
  }

  async existsByEmail(tenantId: string, email: string, excludeId?: string): Promise<boolean> {
    const where: Record<string, unknown> = { email };
    if (excludeId) {
      const { Op } = await import('sequelize');
      where.id = { [Op.ne]: excludeId };
    }
    return this.exists(where, tenantId);
  }

  // ── Raw SQL data-access methods ─────────────────────────────────────────────

  async findAllPaginated(
    tenantId: string,
    options: { limit: number; offset: number; search?: string; sortOrder: string },
  ) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { limit, offset, search, sortOrder } = options;

    const whereClause = search
      ? `AND (first_name ILIKE :search OR last_name ILIKE :search OR email ILIKE :search OR company ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT * FROM contacts WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause} ORDER BY first_name, last_name LIMIT :limit OFFSET :offset`,
      {
        replacements: { tenantId, limit, offset, search: search ? `%${search}%` : '' },
      } as any,
    );

    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM contacts WHERE deleted_at IS NULL AND tenant_id = :tenantId ${whereClause}`,
      { replacements: { tenantId, search: search ? `%${search}%` : '' } },
    );
    const total = parseInt((countResult as unknown as any[])[0]?.total ?? '0', 10);

    return { rows, total };
  }

  async findOneById(tenantId: string, id: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const [rows] = await sequelize.query(
      `SELECT * FROM contacts WHERE id = :id AND deleted_at IS NULL AND tenant_id = :tenantId`,
      { replacements: { id, tenantId } },
    );
    return (rows as unknown as any[])[0] ?? null;
  }

  async findExistingByEmail(tenantId: string, email: string, excludeContactId?: string) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const excludeClause = excludeContactId ? ` AND id != :excludeId` : '';
    const [existing] = await sequelize.query(
      `SELECT id FROM contacts WHERE email = :email AND deleted_at IS NULL AND tenant_id = :tenantId${excludeClause}`,
      {
        replacements: { email, tenantId, excludeId: excludeContactId ?? null },
      } as any,
    );
    return (existing as unknown as any[]).length > 0;
  }

  async insertContact(
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      position?: string | null;
      notes?: string | null;
      createdBy?: string | null;
    },
  ): Promise<string> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const id = uuidv4();
    await sequelize.query(
      `INSERT INTO contacts (id, tenant_id, first_name, last_name, email, phone, company, position, notes, status, created_by, updated_by, created_at, updated_at)
       VALUES (:id, :tenantId, :firstName, :lastName, :email, :phone, :company, :position, :notes, 'active', :createdBy, :createdBy, NOW(), NOW())`,
      {
        replacements: {
          id,
          tenantId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? null,
          phone: data.phone ?? null,
          company: data.company ?? null,
          position: data.position ?? null,
          notes: data.notes ?? null,
          createdBy: data.createdBy ?? null,
        },
      } as any,
    );
    return id;
  }

  async updateContact(
    tenantId: string,
    id: string,
    updates: string[],
    replacements: Record<string, unknown>,
  ): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE contacts SET ${updates.join(', ')} WHERE id = :id AND tenant_id = :tenantId`,
      {
        replacements: { ...replacements, tenantId },
      } as any,
    );
  }

  async softDeleteContact(tenantId: string, id: string, updatedBy: string | null): Promise<void> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    await sequelize.query(
      `UPDATE contacts SET deleted_at = NOW(), updated_by = :updatedBy WHERE id = :id AND tenant_id = :tenantId`,
      { replacements: { id, tenantId, updatedBy } } as any,
    );
  }

  async findDropdown(tenantId: string, options: { search?: string; limit: number }) {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();
    const { search, limit } = options;
    const whereClause = search
      ? `AND (first_name ILIKE :search OR last_name ILIKE :search OR email ILIKE :search OR company ILIKE :search)`
      : '';

    const [rows] = await sequelize.query(
      `SELECT id, first_name, last_name, email, company FROM contacts WHERE deleted_at IS NULL AND status = 'active' AND tenant_id = :tenantId ${whereClause} ORDER BY first_name, last_name LIMIT :limit`,
      {
        replacements: { tenantId, limit, search: search ? `%${search}%` : '' },
      } as any,
    );
    return rows;
  }
}
