import { Injectable, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '@/database/sql/tenant-sequelize.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { SequencesService } from '../../sequences/services/sequences.service';
import {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  SPECIAL_PERMISSIONS,
  ROLE_PERMISSION_MAP,
  SystemRole,
} from '@/common/constants/permissions';

export interface ProvisionResult {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  admin: {
    id: string;
    email: string;
    password: string;
  };
}

/** System role definitions for tenant onboarding. */
const SYSTEM_ROLE_DEFINITIONS: Array<{
  key: SystemRole;
  name: string;
  description: string;
}> = [
  { key: 'super_admin', name: 'Super Admin', description: 'Full system access' },
  { key: 'manager', name: 'Manager', description: 'Management access' },
  { key: 'employee', name: 'Employee', description: 'Basic employee access' },
  { key: 'accountant', name: 'Accountant', description: 'Financial and accounting access' },
  { key: 'hr_manager', name: 'HR Manager', description: 'Human resources management access' },
];

@Injectable()
export class TenantProvisionerService {
  private readonly logger = new Logger(TenantProvisionerService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly sequencesService: SequencesService,
  ) {}

  async provision(dto: CreateTenantDto): Promise<ProvisionResult> {
    const sequelize = this.tenantSequelizeService.getSharedSequelize();

    // Check uniqueness before starting transaction
    const existing = await sequelize.query(
      `SELECT id FROM public.tenants WHERE slug = :slug AND deleted_at IS NULL`,
      { replacements: { slug: dto.slug }, type: 'SELECT' } as any,
    );
    if ((existing as any[]).length > 0) {
      throw new ConflictException(`Tenant slug '${dto.slug}' already exists`);
    }

    // Run entire provisioning in a transaction - rollback on any failure
    const transaction = await sequelize.transaction();

    try {
      // 1. Insert into public.tenants
      const tenantId = uuidv4();
      await sequelize.query(
        `INSERT INTO public.tenants (id, name, slug, status, settings, features, created_at, updated_at)
         VALUES (:id, :name, :slug, 'trial', '{}', :features, NOW(), NOW())`,
        {
          replacements: {
            id: tenantId,
            name: JSON.stringify({ en: dto.name_en, ar: dto.name_ar }),
            slug: dto.slug,
            features: JSON.stringify({
              hr: true,
              inventory: true,
              crm: true,
              purchasing: true,
              projects: true,
              chat: true,
              reporting: true,
            }),
          },
          transaction,
        } as any,
      );
      this.logger.log(`Tenant record created for ${dto.slug} (id=${tenantId})`);

      // 2. Seed all 60 permissions
      const permissionMap = await this.seedPermissions(sequelize, tenantId, transaction);

      // 3. Seed system roles and assign permissions
      const { superAdminRoleId } = await this.seedRolesAndAssignPermissions(
        sequelize,
        tenantId,
        permissionMap,
        transaction,
      );

      // 4. Create admin user
      const adminId = uuidv4();
      const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
      await sequelize.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name,
                            is_active, version, created_at, updated_at)
         VALUES (:id, :tenantId, :email, :passwordHash, :firstName, :lastName,
                 true, 0, NOW(), NOW())`,
        {
          replacements: {
            id: adminId,
            tenantId,
            email: dto.adminEmail,
            passwordHash,
            firstName: dto.adminFirstName_en,
            lastName: dto.adminLastName_en,
          },
          transaction,
        } as any,
      );

      // 5. Assign super_admin role to admin user via user_roles (bigint auto-increment id)
      await sequelize.query(
        `INSERT INTO user_roles (tenant_id, user_id, role_id, created_at, updated_at)
         VALUES (:tenantId, :userId, :roleId, NOW(), NOW())`,
        {
          replacements: {
            tenantId,
            userId: adminId,
            roleId: superAdminRoleId,
          },
          transaction,
        } as any,
      );

      // 6. Create user_tenant_mapping in public schema
      await sequelize.query(
        `INSERT INTO public.user_tenant_mappings (id, email, tenant_id, tenant_slug, user_id, created_at, updated_at)
         VALUES (:id, :email, :tenantId, :tenantSlug, :userId, NOW(), NOW())
         ON CONFLICT (email, tenant_id) DO NOTHING`,
        {
          replacements: {
            id: uuidv4(),
            email: dto.adminEmail,
            tenantId,
            tenantSlug: dto.slug,
            userId: adminId,
          },
          transaction,
        } as any,
      );

      // 7. Create default branch (HQ)
      await sequelize.query(
        `INSERT INTO branches (id, tenant_id, name, code, is_main, is_active, created_at, updated_at)
         VALUES (:id, :tenantId, :name, :code, true, true, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            tenantId,
            name: JSON.stringify({ en: 'Headquarters', ar: 'المقر الرئيسي' }),
            code: 'HQ',
          },
          transaction,
        } as any,
      );

      // Commit the transaction before non-transactional operations
      await transaction.commit();

      // 8. Seed default sequences (non-transactional, uses its own repository)
      try {
        await this.sequencesService.seedDefaultSequences(tenantId);
        this.logger.log(`Default sequences seeded for tenant ${dto.slug}`);
      } catch (seqError) {
        this.logger.warn(`Failed to seed sequences for tenant ${dto.slug}: ${seqError}`);
        // Non-critical: don't fail provisioning
      }

      // 9. Create trial subscription (starter plan, 14-day trial)
      try {
        await this.subscriptionsService.createTrial(tenantId);
        this.logger.log(`Trial subscription created for tenant ${dto.slug}`);
      } catch (subError) {
        this.logger.warn(`Failed to create trial subscription for tenant ${dto.slug}: ${subError}`);
        // Non-critical: don't fail provisioning
      }

      this.logger.log(`Tenant ${dto.slug} provisioned successfully`);

      return {
        tenant: { id: tenantId, name: dto.name, slug: dto.slug },
        admin: { id: adminId, email: dto.adminEmail, password: dto.adminPassword },
      };
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Failed to provision tenant ${dto.slug}`, error);
      throw error;
    }
  }

  /**
   * Seeds all 60 permissions (54 base + 6 special) for the tenant.
   * Returns a map of "module:action" -> permission ID (bigint as string).
   */
  private async seedPermissions(
    sequelize: any,
    tenantId: string,
    transaction: any,
  ): Promise<Map<string, string>> {
    const permissionMap = new Map<string, string>();

    // Seed base matrix: 9 modules x 6 actions = 54
    for (const mod of PERMISSION_MODULES) {
      for (const action of PERMISSION_ACTIONS) {
        const key = `${mod}:${action}`;

        const [inserted] = await sequelize.query(
          `INSERT INTO permissions (tenant_id, module, action, created_at, updated_at)
           VALUES (:tenantId, :module, :action, NOW(), NOW())
           ON CONFLICT (tenant_id, module, action) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          {
            replacements: { tenantId, module: mod, action },
            transaction,
            type: 'SELECT',
          } as any,
        );
        if (inserted) permissionMap.set(key, String((inserted as any).id));
      }
    }

    // Seed special permissions (6)
    for (const special of SPECIAL_PERMISSIONS) {
      const [mod, ...actionParts] = special.split(':');
      const action = actionParts.join(':');

      const [inserted] = await sequelize.query(
        `INSERT INTO permissions (tenant_id, module, action, created_at, updated_at)
         VALUES (:tenantId, :module, :action, NOW(), NOW())
         ON CONFLICT (tenant_id, module, action) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        {
          replacements: { tenantId, module: mod, action },
          transaction,
          type: 'SELECT',
        } as any,
      );
      if (inserted) permissionMap.set(special, String((inserted as any).id));
    }

    this.logger.log(`Seeded ${permissionMap.size} permissions for tenant ${tenantId}`);
    return permissionMap;
  }

  /**
   * Seeds system roles and creates role_permissions entries based on ROLE_PERMISSION_MAP.
   */
  private async seedRolesAndAssignPermissions(
    sequelize: any,
    tenantId: string,
    permissionMap: Map<string, string>,
    transaction: any,
  ): Promise<{ superAdminRoleId: string }> {
    let superAdminRoleId = '';

    for (const roleDef of SYSTEM_ROLE_DEFINITIONS) {
      // Create the role (bigint auto-increment id)
      const [inserted] = await sequelize.query(
        `INSERT INTO roles (tenant_id, name, description, is_system, version, created_at, updated_at)
         VALUES (:tenantId, :name, :description, true, 0, NOW(), NOW())
         RETURNING id`,
        {
          replacements: {
            tenantId,
            name: roleDef.name,
            description: roleDef.description,
          },
          transaction,
          type: 'SELECT',
        } as any,
      );

      const roleId = String((inserted as any).id);

      if (roleDef.key === 'super_admin') {
        superAdminRoleId = roleId;
      }

      // Assign permissions from the ROLE_PERMISSION_MAP
      const rolePermissions = ROLE_PERMISSION_MAP[roleDef.key] || [];

      for (const perm of rolePermissions) {
        const permId = permissionMap.get(perm);
        if (!permId) continue;

        await sequelize.query(
          `INSERT INTO role_permissions (tenant_id, role_id, permission_id, created_at, updated_at)
           VALUES (:tenantId, :roleId, :permissionId, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          {
            replacements: {
              tenantId,
              roleId,
              permissionId: permId,
            },
            transaction,
          } as any,
        );
      }
    }

    this.logger.log(`Seeded ${SYSTEM_ROLE_DEFINITIONS.length} system roles for tenant ${tenantId}`);
    return { superAdminRoleId };
  }
}
