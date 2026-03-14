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
import { ProvisionResult } from '../interfaces/tenant.interface';
import { SAUDI_COA_DEFAULTS, COA_SETTING_KEY_MAP } from '@/common/defaults/saudi-coa.defaults';

/** Notification template definitions for new tenants. */
const DEFAULT_NOTIFICATION_TEMPLATES: Array<{
  eventType: string;
  channel: string;
  subjectEn: string;
  subjectAr: string;
  bodyEn: string;
  bodyAr: string;
}> = [
  {
    eventType: 'pos_checkout',
    channel: 'push',
    subjectEn: 'Receipt for {{orderNumber}}',
    subjectAr: 'إيصال الطلب {{orderNumber}}',
    bodyEn: 'Your order {{orderNumber}} total: {{totalAmount}} {{currency}}',
    bodyAr: 'إجمالي طلبك {{orderNumber}}: {{totalAmount}} {{currency}}',
  },
  {
    eventType: 'loyalty_earn',
    channel: 'push',
    subjectEn: 'Points earned',
    subjectAr: 'نقاط مكتسبة',
    bodyEn: 'You earned {{points}} points. Balance: {{balance}}',
    bodyAr: 'اكتسبت {{points}} نقطة. الرصيد: {{balance}}',
  },
  {
    eventType: 'loyalty_tier_upgrade',
    channel: 'push',
    subjectEn: 'Tier upgrade!',
    subjectAr: 'ترقية المستوى!',
    bodyEn: 'Congratulations, you reached {{tierName}} tier',
    bodyAr: 'تهانينا، وصلت إلى مستوى {{tierName}}',
  },
  {
    eventType: 'low_stock_alert',
    channel: 'in_app',
    subjectEn: 'Low stock: {{productNameEn}}',
    subjectAr: 'مخزون منخفض: {{productNameAr}}',
    bodyEn:
      'Only {{currentQty}} units of {{productNameEn}} remaining (reorder point: {{reorderPoint}})',
    bodyAr: 'تبقى {{currentQty}} وحدة من {{productNameAr}} (نقطة إعادة الطلب: {{reorderPoint}})',
  },
  {
    eventType: 'contract_expiry_warning',
    channel: 'in_app',
    subjectEn: 'Contract expiring soon',
    subjectAr: 'العقد على وشك الانتهاء',
    bodyEn: 'Contract for {{employeeName}} expires in {{daysRemaining}} days',
    bodyAr: 'عقد {{employeeName}} ينتهي خلال {{daysRemaining}} يوماً',
  },
  {
    eventType: 'purchase_order_due',
    channel: 'in_app',
    subjectEn: 'PO due tomorrow',
    subjectAr: 'أمر شراء مستحق غداً',
    bodyEn: 'Purchase order {{orderNumber}} from {{vendorName}} is due tomorrow',
    bodyAr: 'أمر الشراء {{orderNumber}} من {{vendorName}} مستحق غداً',
  },
  {
    eventType: 'lead_closing_soon',
    channel: 'in_app',
    subjectEn: 'Lead closing soon',
    subjectAr: 'فرصة على وشك الإغلاق',
    bodyEn: 'Lead "{{title}}" expected to close in {{daysRemaining}} days',
    bodyAr: 'الفرصة "{{title}}" متوقع إغلاقها خلال {{daysRemaining}} يوماً',
  },
  {
    eventType: 'payroll_approved',
    channel: 'in_app',
    subjectEn: 'Payroll approved',
    subjectAr: 'تمت الموافقة على الراتب',
    bodyEn: 'Your payroll for {{period}} has been approved. Net pay: {{netPay}} SAR',
    bodyAr: 'تمت الموافقة على راتبك لـ {{period}}. صافي الراتب: {{netPay}} ريال',
  },
  {
    eventType: 'sales_order_confirmed',
    channel: 'in_app',
    subjectEn: 'Sales order confirmed',
    subjectAr: 'تم تأكيد أمر البيع',
    bodyEn: 'Sales order {{orderNumber}} has been confirmed',
    bodyAr: 'تم تأكيد أمر البيع {{orderNumber}}',
  },
  {
    eventType: 'sales_order_delivered',
    channel: 'in_app',
    subjectEn: 'Order delivered',
    subjectAr: 'تم تسليم الطلب',
    bodyEn: 'Sales order {{orderNumber}} has been delivered',
    bodyAr: 'تم تسليم أمر البيع {{orderNumber}}',
  },
  {
    eventType: 'purchase_order_received',
    channel: 'in_app',
    subjectEn: 'PO received',
    subjectAr: 'تم استلام أمر الشراء',
    bodyEn: 'Purchase order {{orderNumber}} has been received',
    bodyAr: 'تم استلام أمر الشراء {{orderNumber}}',
  },
  {
    eventType: 'zatca_submission_failed',
    channel: 'in_app',
    subjectEn: 'ZATCA submission failed',
    subjectAr: 'فشل إرسال فاتورة ZATCA',
    bodyEn: 'Invoice {{orderNumber}} failed ZATCA submission: {{error}}',
    bodyAr: 'فشل إرسال الفاتورة {{orderNumber}} إلى ZATCA: {{error}}',
  },
  {
    eventType: 'stock_adjustment',
    channel: 'in_app',
    subjectEn: 'Stock adjusted',
    subjectAr: 'تم تعديل المخزون',
    bodyEn: 'Stock for {{productNameEn}} adjusted by {{quantity}} units. Reason: {{reason}}',
    bodyAr: 'تم تعديل مخزون {{productNameAr}} بمقدار {{quantity}} وحدة. السبب: {{reason}}',
  },
  {
    eventType: 'contract_expired',
    channel: 'in_app',
    subjectEn: 'Contract expired',
    subjectAr: 'انتهى العقد',
    bodyEn: 'Contract for employee {{employeeId}} has expired on {{endDate}}',
    bodyAr: 'انتهى عقد الموظف {{employeeId}} بتاريخ {{endDate}}',
  },
  {
    eventType: 'loyalty_points_expired',
    channel: 'push',
    subjectEn: 'Points expired',
    subjectAr: 'انتهت صلاحية النقاط',
    bodyEn: '{{points}} loyalty points have expired from your account',
    bodyAr: 'انتهت صلاحية {{points}} نقطة ولاء من حسابك',
  },
];

/** System role definitions for tenant onboarding. */
const SYSTEM_ROLE_DEFINITIONS: Array<{
  key: SystemRole;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
}> = [
  {
    key: 'super_admin',
    nameEn: 'Super Admin',
    nameAr: 'مدير النظام',
    descriptionEn: 'Full system access',
    descriptionAr: 'صلاحيات كاملة للنظام',
  },
  {
    key: 'manager',
    nameEn: 'Manager',
    nameAr: 'مدير',
    descriptionEn: 'Management access',
    descriptionAr: 'صلاحيات الإدارة',
  },
  {
    key: 'employee',
    nameEn: 'Employee',
    nameAr: 'موظف',
    descriptionEn: 'Basic employee access',
    descriptionAr: 'صلاحيات الموظف الأساسية',
  },
  {
    key: 'accountant',
    nameEn: 'Accountant',
    nameAr: 'محاسب',
    descriptionEn: 'Financial and accounting access',
    descriptionAr: 'صلاحيات مالية ومحاسبية',
  },
  {
    key: 'hr_manager',
    nameEn: 'HR Manager',
    nameAr: 'مدير الموارد البشرية',
    descriptionEn: 'Human resources management access',
    descriptionAr: 'صلاحيات إدارة الموارد البشرية',
  },
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
      `SELECT id FROM public.tenants WHERE slug = :slug AND "deletedAt" IS NULL`,
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
        `INSERT INTO public.tenants (id, "nameEn", "nameAr", slug, status, settings, features, "createdAt", "updatedAt")
         VALUES (:id, :nameEn, :nameAr, :slug, 'trial', '{}', :features, NOW(), NOW())`,
        {
          replacements: {
            id: tenantId,
            nameEn: dto.nameEn,
            nameAr: dto.nameAr,
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
        `INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName",
                            "isActive", version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :email, :passwordHash, :firstName, :lastName,
                 true, 0, NOW(), NOW())`,
        {
          replacements: {
            id: adminId,
            tenantId,
            email: dto.adminEmail,
            passwordHash,
            firstName: dto.adminFirstNameEn,
            lastName: dto.adminLastNameEn,
          },
          transaction,
        } as any,
      );

      // 5. Assign super_admin role to admin user via user_roles (bigint auto-increment id)
      await sequelize.query(
        `INSERT INTO user_roles ("tenantId", "userId", "roleId", "createdAt", "updatedAt")
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
        `INSERT INTO public.user_tenant_mappings (id, email, "tenantId", "tenantSlug", "userId", "createdAt", "updatedAt")
         VALUES (:id, :email, :tenantId, :tenantSlug, :userId, NOW(), NOW())
         ON CONFLICT (email, "tenantId") DO NOTHING`,
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
      const branchId = uuidv4();
      await sequelize.query(
        `INSERT INTO branches (id, "tenantId", "nameEn", "nameAr", code, "isMain", "isActive", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, :nameEn, :nameAr, :code, true, true, NOW(), NOW())`,
        {
          replacements: {
            id: branchId,
            tenantId,
            nameEn: 'Headquarters',
            nameAr: 'المقر الرئيسي',
            code: 'HQ',
          },
          transaction,
        } as any,
      );

      // ── Steps 10–18: Default data provisioning (in-transaction) ─────────

      // 10. SAR base currency
      const sarId = uuidv4();
      await sequelize.query(
        `INSERT INTO currencies (id, "tenantId", code, "nameEn", "nameAr", symbol, "isBase", "isActive", "decimalPlaces", "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'SAR', 'Saudi Riyal', 'ريال سعودي', 'ر.س', true, true, 2, NOW(), NOW())`,
        { replacements: { id: sarId, tenantId }, transaction } as any,
      );
      this.logger.log(`SAR base currency created for tenant ${dto.slug}`);

      // 11. Saudi Chart of Accounts (26 accounts)
      const accountByCode = new Map<string, string>();
      for (const acct of SAUDI_COA_DEFAULTS) {
        const accountId = uuidv4();
        await sequelize.query(
          `INSERT INTO chart_of_accounts (id, "tenantId", code, "nameEn", "nameAr", type, "normalBalance", "allowDirectPosting", "isActive", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :code, :nameEn, :nameAr, :type, :normalBalance, :allowDirectPosting, :isActive, 0, NOW(), NOW())`,
          {
            replacements: {
              id: accountId,
              tenantId,
              code: acct.code,
              nameEn: acct.nameEn,
              nameAr: acct.nameAr,
              type: acct.accountType,
              normalBalance: acct.normalBalance,
              allowDirectPosting: acct.allowDirectPosting,
              isActive: acct.isActive,
            },
            transaction,
          } as any,
        );
        accountByCode.set(acct.code, accountId);
      }
      this.logger.log(`Seeded ${SAUDI_COA_DEFAULTS.length} COA accounts for tenant ${dto.slug}`);

      // 12. COA account ID tenant settings (15 keys)
      for (const [key, code] of Object.entries(COA_SETTING_KEY_MAP)) {
        const accountId = accountByCode.get(code);
        if (accountId) {
          await sequelize.query(
            `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, version, "createdAt", "updatedAt")
             VALUES (:id, :tenantId, :key, :value, 'accounting', 'string', 0, NOW(), NOW())
             ON CONFLICT ("tenantId", key) DO UPDATE SET value = :value, "updatedAt" = NOW()`,
            {
              replacements: { id: uuidv4(), tenantId, key, value: accountId },
              transaction,
            } as any,
          );
        }
      }
      // Mark COA as seeded
      await sequelize.query(
        `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'coaSeeded', 'true', 'accounting', 'boolean', 0, NOW(), NOW())
         ON CONFLICT ("tenantId", key) DO UPDATE SET value = 'true', "updatedAt" = NOW()`,
        { replacements: { id: uuidv4(), tenantId }, transaction } as any,
      );
      this.logger.log(`COA account settings seeded for tenant ${dto.slug}`);

      // 13. General tenant settings
      const generalSettings = [
        { key: 'fiscalYearStartMonth', value: '1', group: 'accounting', type: 'number' },
        { key: 'defaultCurrency', value: 'SAR', group: 'general', type: 'string' },
        { key: 'salaryCalculationBasis', value: 'actualDays', group: 'hr', type: 'string' },
        { key: 'timezone', value: 'Asia/Riyadh', group: 'general', type: 'string' },
        { key: 'vatRate', value: '15', group: 'accounting', type: 'number' },
        { key: 'allowNegativeStock', value: 'false', group: 'inventory', type: 'boolean' },
      ];
      for (const s of generalSettings) {
        await sequelize.query(
          `INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, :key, :value, :group, :type, 0, NOW(), NOW())
           ON CONFLICT ("tenantId", key) DO UPDATE SET value = :value, "updatedAt" = NOW()`,
          {
            replacements: { id: uuidv4(), tenantId, ...s },
            transaction,
          } as any,
        );
      }
      this.logger.log(`General tenant settings seeded for tenant ${dto.slug}`);

      // 14. Fiscal periods for current year (12 months, all open)
      const year = new Date().getFullYear();
      for (let i = 0; i < 12; i++) {
        const startDate = new Date(year, i, 1);
        const endDate = new Date(year, i + 1, 0); // last day of month
        const nameEn = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        const nameAr = startDate.toLocaleString('ar-SA', { month: 'long', year: 'numeric' });

        await sequelize.query(
          `INSERT INTO fiscal_periods ("tenantId", "nameEn", "nameAr", "fiscalYear", "periodNumber", "periodType", "startDate", "endDate", status, version, "createdAt", "updatedAt")
           VALUES (:tenantId, :nameEn, :nameAr, :fiscalYear, :periodNumber, 'monthly', :startDate, :endDate, 'open', 0, NOW(), NOW())`,
          {
            replacements: {
              tenantId,
              nameEn,
              nameAr,
              fiscalYear: year,
              periodNumber: i + 1,
              startDate: startDate.toISOString().split('T')[0],
              endDate: endDate.toISOString().split('T')[0],
            },
            transaction,
          } as any,
        );
      }
      this.logger.log(`12 fiscal periods seeded for tenant ${dto.slug} (year ${year})`);

      // 15. Default warehouse (linked to HQ branch)
      await sequelize.query(
        `INSERT INTO warehouses (id, "tenantId", "nameEn", "nameAr", "branchId", "isActive", "allowNegativeStock", version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'Main Warehouse', 'المستودع الرئيسي', :branchId, true, false, 0, NOW(), NOW())`,
        {
          replacements: { id: uuidv4(), tenantId, branchId },
          transaction,
        } as any,
      );
      this.logger.log(`Default warehouse created for tenant ${dto.slug}`);

      // 16. Default department
      await sequelize.query(
        `INSERT INTO departments (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'General', 'عام', 'Default department', 'القسم الافتراضي', 0, NOW(), NOW())`,
        {
          replacements: { id: uuidv4(), tenantId },
          transaction,
        } as any,
      );
      this.logger.log(`Default department created for tenant ${dto.slug}`);

      // 17. Default shift (Saudi work week: Sunday–Thursday)
      await sequelize.query(
        `INSERT INTO shifts (id, "tenantId", "nameEn", "nameAr", "startTime", "endTime", "breakMinutes", "workingDays", "isActive", version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'Morning Shift', 'الدوام الصباحي', '08:00', '16:00', 60, :workingDays, true, 0, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            tenantId,
            workingDays: JSON.stringify([0, 1, 2, 3, 4]), // Sun–Thu
          },
          transaction,
        } as any,
      );
      this.logger.log(`Default shift created for tenant ${dto.slug}`);

      // 18. Default treasury cash account (linked to COA Cash + HQ branch)
      const cashAccountId = accountByCode.get('1100');
      await sequelize.query(
        `INSERT INTO treasury_accounts (id, "tenantId", "nameEn", "nameAr", type, currency, "currentBalance", "coaAccountId", "branchId", "isDefault", "isActive", version, "createdAt", "updatedAt")
         VALUES (:id, :tenantId, 'Main Cash', 'الصندوق الرئيسي', 'cash', 'SAR', 0, :coaAccountId, :branchId, true, true, 0, NOW(), NOW())`,
        {
          replacements: {
            id: uuidv4(),
            tenantId,
            coaAccountId: cashAccountId ?? null,
            branchId,
          },
          transaction,
        } as any,
      );
      this.logger.log(`Default treasury cash account created for tenant ${dto.slug}`);

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

      // 19. Default notification templates
      try {
        await this.seedNotificationTemplates(sequelize, tenantId, dto.slug);
        this.logger.log(`Notification templates seeded for tenant ${dto.slug}`);
      } catch (ntErr: any) {
        this.logger.warn(`Failed to seed notification templates for ${dto.slug}: ${ntErr.message}`);
      }

      // 20. USD currency + SAR↔USD exchange rates
      try {
        await this.seedUsdCurrency(sequelize, tenantId, sarId);
        this.logger.log(`USD currency + exchange rates seeded for tenant ${dto.slug}`);
      } catch (usdErr: any) {
        this.logger.warn(`Failed to seed USD currency for ${dto.slug}: ${usdErr.message}`);
      }

      // 21. Default product category
      try {
        await sequelize.query(
          `INSERT INTO product_categories (id, "tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'General', 'عام', 'Default product category', 'الفئة الافتراضية للمنتجات', 0, NOW(), NOW())`,
          { replacements: { id: uuidv4(), tenantId } } as any,
        );
        this.logger.log(`Default product category created for tenant ${dto.slug}`);
      } catch (catErr: any) {
        this.logger.warn(`Failed to seed product category for ${dto.slug}: ${catErr.message}`);
      }

      // 22. Default cost center
      try {
        await sequelize.query(
          `INSERT INTO cost_centers (id, "tenantId", code, "nameEn", "nameAr", "isActive", version, "createdAt", "updatedAt")
           VALUES (:id, :tenantId, 'CC-001', 'General', 'عام', true, 0, NOW(), NOW())`,
          { replacements: { id: uuidv4(), tenantId } } as any,
        );
        this.logger.log(`Default cost center created for tenant ${dto.slug}`);
      } catch (ccErr: any) {
        this.logger.warn(`Failed to seed cost center for ${dto.slug}: ${ccErr.message}`);
      }

      this.logger.log(`Tenant ${dto.slug} provisioned successfully`);

      return {
        tenant: { id: tenantId, nameEn: dto.nameEn, nameAr: dto.nameAr, slug: dto.slug },
        admin: { id: adminId, email: dto.adminEmail, password: dto.adminPassword },
      };
    } catch (error) {
      await transaction.rollback();
      this.logger.error(`Failed to provision tenant ${dto.slug}`, error);
      throw error;
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

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
          `INSERT INTO permissions ("tenantId", module, action, "createdAt", "updatedAt")
           VALUES (:tenantId, :module, :action, NOW(), NOW())
           ON CONFLICT ("tenantId", module, action) DO UPDATE SET "updatedAt" = NOW()
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
        `INSERT INTO permissions ("tenantId", module, action, "createdAt", "updatedAt")
         VALUES (:tenantId, :module, :action, NOW(), NOW())
         ON CONFLICT ("tenantId", module, action) DO UPDATE SET "updatedAt" = NOW()
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
   * Seeds system roles and creates rolePermissions entries based on ROLE_PERMISSION_MAP.
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
        `INSERT INTO roles ("tenantId", "nameEn", "nameAr", "descriptionEn", "descriptionAr", "isSystem", version, "createdAt", "updatedAt")
         VALUES (:tenantId, :nameEn, :nameAr, :descriptionEn, :descriptionAr, true, 0, NOW(), NOW())
         RETURNING id`,
        {
          replacements: {
            tenantId,
            nameEn: roleDef.nameEn,
            nameAr: roleDef.nameAr,
            descriptionEn: roleDef.descriptionEn,
            descriptionAr: roleDef.descriptionAr,
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
          `INSERT INTO "rolePermissions" ("tenantId", "roleId", "permissionId", "createdAt", "updatedAt")
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

  /**
   * Seeds 13 default notification templates for the tenant (post-commit).
   */
  private async seedNotificationTemplates(
    sequelize: any,
    tenantId: string,
    tenantSlug: string,
  ): Promise<void> {
    for (const t of DEFAULT_NOTIFICATION_TEMPLATES) {
      await sequelize.query(
        `INSERT INTO notification_templates ("tenantId", "tenantSlug", "eventType", channel, "subjectEn", "subjectAr", "bodyEn", "bodyAr", "isDefault", version, "createdAt", "updatedAt")
         VALUES (:tenantId, :tenantSlug, :eventType, :channel, :subjectEn, :subjectAr, :bodyEn, :bodyAr, true, 0, NOW(), NOW())`,
        {
          replacements: {
            tenantId,
            tenantSlug,
            eventType: t.eventType,
            channel: t.channel,
            subjectEn: t.subjectEn,
            subjectAr: t.subjectAr,
            bodyEn: t.bodyEn,
            bodyAr: t.bodyAr,
          },
        } as any,
      );
    }
  }

  /**
   * Seeds USD currency and SAR↔USD exchange rates (post-commit).
   */
  private async seedUsdCurrency(sequelize: any, tenantId: string, sarId: string): Promise<void> {
    const usdId = uuidv4();
    await sequelize.query(
      `INSERT INTO currencies (id, "tenantId", code, "nameEn", "nameAr", symbol, "isBase", "isActive", "decimalPlaces", "createdAt", "updatedAt")
       VALUES (:id, :tenantId, 'USD', 'US Dollar', 'دولار أمريكي', '$', false, true, 2, NOW(), NOW())`,
      { replacements: { id: usdId, tenantId } } as any,
    );

    const today = new Date().toISOString().split('T')[0];

    await sequelize.query(
      `INSERT INTO exchange_rates (id, "tenantId", "fromCurrencyId", "toCurrencyId", rate, "rateDate", source, "createdAt", "updatedAt")
       VALUES (:id1, :tenantId, :usdId, :sarId, 3.75, :rateDate, 'manual', NOW(), NOW()),
              (:id2, :tenantId, :sarId, :usdId, 0.2667, :rateDate, 'manual', NOW(), NOW())`,
      {
        replacements: {
          id1: uuidv4(),
          id2: uuidv4(),
          tenantId,
          usdId,
          sarId,
          rateDate: today,
        },
      } as any,
    );
  }
}
