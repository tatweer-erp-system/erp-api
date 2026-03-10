import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Enable pg_trgm for GIN trigram indexes (iLike search on name_en/name_ar)
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');

  await qi.createTable('tenants', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(255), allowNull: false },
    slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    status: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'trial' },
    trial_ends_at: { type: DataTypes.DATE, allowNull: true },
    suspended_at: { type: DataTypes.DATE, allowNull: true },
    suspend_reason: { type: DataTypes.STRING(255), allowNull: true },
    cancelled_at: { type: DataTypes.DATE, allowNull: true },
    settings: { type: DataTypes.JSONB, defaultValue: {} },
    features: {
      type: DataTypes.JSONB,
      defaultValue: { hr: true, inventory: true, crm: true, purchasing: true, projects: true, chat: true, reporting: true },
    },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, defaultValue: 0 },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
  });

  await qi.addIndex('tenants', ['slug'], { unique: true });
  await qi.addIndex('tenants', ['status']);
  await qi.addIndex('tenants', ['created_at']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('tenants');
}
