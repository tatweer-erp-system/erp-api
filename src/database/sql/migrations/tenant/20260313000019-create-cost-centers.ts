import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('cost_centers', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    parentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'cost_centers', key: 'id' },
      onDelete: 'SET NULL',
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
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

  await qi.addIndex('cost_centers', ['tenantId']);
  await qi.addIndex('cost_centers', ['parentId']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_code_tenant_unique" ON "cost_centers" ("tenantId", "code") WHERE "deletedAt" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "cost_centers_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('cost_centers');
}
