import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('cost_centers', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(20), allowNull: false },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    parent_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'cost_centers', key: 'id' },
      onDelete: 'SET NULL',
    },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_by: { type: DataTypes.UUID, allowNull: true },
    updated_by: { type: DataTypes.UUID, allowNull: true },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    created_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ' as any,
      allowNull: false,
      defaultValue: Sequelize.literal('NOW()'),
    },
    deleted_at: { type: 'TIMESTAMPTZ' as any, allowNull: true },
  });

  await qi.addIndex('cost_centers', ['tenant_id']);
  await qi.addIndex('cost_centers', ['parent_id']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "cost_centers_code_tenant_unique" ON "cost_centers" ("tenant_id", "code") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "cost_centers_code_tenant_unique"');
  await sequelize.getQueryInterface().dropTable('cost_centers');
}
