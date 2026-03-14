import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── 1. Create system_settings table (no tenantId) ─────────────────────────
  await qi.createTable(
    { tableName: 'system_settings', schema: 'public' },
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      key: { type: DataTypes.STRING(255), allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      group: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'general' },
      type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
      },
      description: { type: DataTypes.STRING(255), allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    },
  );

  await qi.addIndex({ tableName: 'system_settings', schema: 'public' }, ['key'], {
    unique: true,
    where: { deletedAt: null },
    name: 'system_settings_key_unique',
  });

  // ── 2. Create tenant_settings table (with tenantId) ───────────────────────
  await qi.createTable(
    { tableName: 'tenant_settings', schema: 'public' },
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      key: { type: DataTypes.STRING(255), allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      group: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'general' },
      type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
      },
      description: { type: DataTypes.STRING(255), allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    },
  );

  await qi.addIndex({ tableName: 'tenant_settings', schema: 'public' }, ['tenantId'], {
    name: 'tenant_settings_tenant_id',
  });
  await qi.addIndex({ tableName: 'tenant_settings', schema: 'public' }, ['tenantId', 'key'], {
    unique: true,
    where: { deletedAt: null },
    name: 'tenant_settings_tenant_id_key',
  });

  // ── 3. Migrate existing data from settings → tenant_settings ──────────────
  // All existing rows are tenant-scoped (the old table required tenantId)
  await sequelize.query(`
    INSERT INTO tenant_settings (id, "tenantId", key, value, "group", type, description, "createdBy", "updatedBy", version, "createdAt", "updatedAt", "deletedAt")
    SELECT id, "tenantId", key, value, "group", type::text::enum_tenant_settings_type, description, "createdBy", "updatedBy", version, "createdAt", "updatedAt", "deletedAt"
    FROM settings
  `);

  // ── 4. Drop the old settings table ────────────────────────────────────────
  await qi.dropTable({ tableName: 'settings', schema: 'public' });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Recreate original settings table
  await qi.createTable(
    { tableName: 'settings', schema: 'public' },
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      tenantId: { type: DataTypes.UUID, allowNull: false },
      key: { type: DataTypes.STRING(255), allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: true },
      group: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'general' },
      type: {
        type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
        allowNull: false,
        defaultValue: 'string',
      },
      description: { type: DataTypes.STRING(255), allowNull: true },
      createdBy: { type: DataTypes.UUID, allowNull: true },
      updatedBy: { type: DataTypes.UUID, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      createdAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: 'TIMESTAMPTZ' as any,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      deletedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    },
  );

  await qi.addIndex({ tableName: 'settings', schema: 'public' }, ['tenantId']);
  await qi.addIndex({ tableName: 'settings', schema: 'public' }, ['tenantId', 'key'], {
    unique: true,
    where: { deletedAt: null },
  });

  // Migrate tenant_settings back
  await sequelize.query(`
    INSERT INTO settings (id, "tenantId", key, value, "group", type, description, "createdBy", "updatedBy", version, "createdAt", "updatedAt", "deletedAt")
    SELECT id, "tenantId", key, value, "group", type::text::enum_settings_type, description, "createdBy", "updatedBy", version, "createdAt", "updatedAt", "deletedAt"
    FROM tenant_settings
  `);

  // Drop new tables
  await qi.dropTable({ tableName: 'system_settings', schema: 'public' });
  await qi.dropTable({ tableName: 'tenant_settings', schema: 'public' });
}
