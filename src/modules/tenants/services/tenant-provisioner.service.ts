import { Injectable, ConflictException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { TenantSequelizeService } from '../../../database/tenant-sequelize.service';
import { UmzugService } from '../../../database/umzug.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';

interface ProvisionResult {
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

const DEFAULT_MODULES = [
  'users',
  'roles',
  'hr',
  'inventory',
  'crm',
  'purchasing',
  'projects',
  'reporting',
  'chat',
  'notifications',
];

const DEFAULT_ACTIONS = ['create', 'read', 'update', 'delete', 'list'];

@Injectable()
export class TenantProvisionerService {
  private readonly logger = new Logger(TenantProvisionerService.name);

  constructor(
    private readonly tenantSequelizeService: TenantSequelizeService,
    private readonly umzugService: UmzugService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async provision(dto: CreateTenantDto): Promise<ProvisionResult> {
    const sharedSequelize = this.tenantSequelizeService.getSharedSequelize();

    // Check uniqueness
    const [existing] = await sharedSequelize.query(
      `SELECT id FROM public.tenants WHERE slug = :slug AND deleted_at IS NULL`,
      { replacements: { slug: dto.slug }, type: 'SELECT' } as any,
    );
    if ((existing as any[]).length > 0) {
      throw new ConflictException(`Tenant slug '${dto.slug}' already exists`);
    }

    // 1. Insert into public.tenants
    const tenantId = uuidv4();
    await sharedSequelize.query(
      `INSERT INTO public.tenants (id, name, slug, plan, is_active, settings, created_at, updated_at)
       VALUES (:id, :name, :slug, :plan, true, '{}', NOW(), NOW())`,
      {
        replacements: {
          id: tenantId,
          name: dto.name,
          slug: dto.slug,
          plan: dto.plan ?? 'starter',
        },
      } as any,
    );

    // 2. Create schema
    await this.tenantSequelizeService.createTenantSchema(dto.slug);
    this.logger.log(`Schema tenant_${dto.slug} created`);

    // 3. Run tenant migrations
    const tenantSequelize = await this.tenantSequelizeService.getSequelizeForTenant(dto.slug);
    await this.umzugService.runTenantMigrations(tenantSequelize as any, dto.slug);
    this.logger.log(`Migrations ran for tenant_${dto.slug}`);

    // 4. Seed roles and permissions
    const { adminRoleId } = await this.seedRolesAndPermissions(tenantSequelize);

    // 5. Create admin user
    const adminId = uuidv4();
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    await tenantSequelize.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, is_active, created_at, updated_at)
       VALUES (:id, :email, :passwordHash, :firstName, :lastName, true, NOW(), NOW())`,
      {
        replacements: {
          id: adminId,
          email: dto.adminEmail,
          passwordHash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
        },
      } as any,
    );

    // Assign admin role
    await tenantSequelize.query(
      `INSERT INTO user_roles (id, user_id, role_id, created_at, updated_at)
       VALUES (:id, :userId, :roleId, NOW(), NOW())`,
      { replacements: { id: uuidv4(), userId: adminId, roleId: adminRoleId } } as any,
    );

    // 6. Create trial subscription (starter plan, 14-day trial)
    await this.subscriptionsService.createTrial(tenantId);
    this.logger.log(`Trial subscription created for tenant ${dto.slug}`);

    this.logger.log(`Tenant ${dto.slug} provisioned successfully`);

    return {
      tenant: { id: tenantId, name: dto.name, slug: dto.slug },
      admin: { id: adminId, email: dto.adminEmail, password: dto.adminPassword },
    };
  }

  private async seedRolesAndPermissions(sequelize: any): Promise<{ adminRoleId: string }> {
    const roles = [
      { id: uuidv4(), name: 'Admin', description: 'Full access', isSystem: true },
      { id: uuidv4(), name: 'Manager', description: 'Management access', isSystem: true },
      { id: uuidv4(), name: 'Employee', description: 'Basic employee access', isSystem: true },
    ];

    for (const role of roles) {
      await sequelize.query(
        `INSERT INTO roles (id, name, description, is_system, created_at, updated_at)
         VALUES (:id, :name, :description, :isSystem, NOW(), NOW())`,
        {
          replacements: {
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.isSystem,
          },
        } as any,
      );
    }

    const adminRole = roles[0];
    const permissionIds: string[] = [];

    for (const module of DEFAULT_MODULES) {
      for (const action of DEFAULT_ACTIONS) {
        const permId = uuidv4();
        permissionIds.push(permId);
        await sequelize.query(
          `INSERT INTO permissions (id, module, action, created_at, updated_at)
           VALUES (:id, :module, :action, NOW(), NOW())
           ON CONFLICT (module, action) DO NOTHING`,
          { replacements: { id: permId, module, action } } as any,
        );
        await sequelize.query(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at)
           SELECT :id, :roleId, id, NOW(), NOW() FROM permissions WHERE module = :module AND action = :action
           ON CONFLICT DO NOTHING`,
          {
            replacements: {
              id: uuidv4(),
              roleId: adminRole.id,
              module,
              action,
            },
          } as any,
        );
      }
    }

    return { adminRoleId: adminRole.id };
  }
}
