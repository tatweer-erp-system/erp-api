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
    trialEndsAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    suspendedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    suspendReason: { type: DataTypes.STRING(255), allowNull: true },
    cancelledAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    settings: { type: DataTypes.JSONB, defaultValue: {} },
    features: {
      type: DataTypes.JSONB,
      defaultValue: {
        hr: true,
        inventory: true,
        crm: true,
        purchasing: true,
        projects: true,
        chat: true,
        reporting: true,
      },
    },
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
  });

  await qi.addIndex('tenants', ['slug'], { unique: true });
  await qi.addIndex('tenants', ['status']);
  await qi.addIndex('tenants', ['createdAt']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('tenants');
}
