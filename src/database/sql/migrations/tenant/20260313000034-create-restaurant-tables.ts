import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('restaurant_tables', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenant_id: { type: DataTypes.UUID, allowNull: false },
    section_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'restaurant_sections', key: 'id' },
      onDelete: 'SET NULL',
    },
    number: { type: DataTypes.STRING(20), allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4 },
    min_capacity: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'available' },
    pos_x: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    pos_y: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
    shape: { type: DataTypes.STRING(20), allowNull: true, defaultValue: 'square' },
    width: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 80 },
    height: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 80 },
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

  await qi.addIndex('restaurant_tables', ['tenant_id']);
  await qi.addIndex('restaurant_tables', ['section_id']);
  await qi.addIndex('restaurant_tables', ['status']);

  await sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_tables_number_section_unique" ON "restaurant_tables" ("section_id", "number") WHERE "deleted_at" IS NULL',
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.query('DROP INDEX IF EXISTS "restaurant_tables_number_section_unique"');
  await sequelize.getQueryInterface().dropTable('restaurant_tables');
}
