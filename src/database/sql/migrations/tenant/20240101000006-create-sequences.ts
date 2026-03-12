import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('sequences', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    branch_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    entity: { type: DataTypes.STRING(50), allowNull: false },
    prefix: { type: DataTypes.STRING(20), allowNull: false },
    last_value: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    padding: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    reset_cycle: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'never' },
    fiscal_year: { type: DataTypes.INTEGER, allowNull: true },
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

  await qi.addIndex('sequences', ['tenant_id', 'branch_id', 'entity'], {
    unique: true,
    name: 'sequences_tenant_branch_entity_unique',
  });
  await qi.addIndex('sequences', ['tenant_id']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('sequences');
}
