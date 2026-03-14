import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'user_appearance_settings', schema: 'public' };

  await qi.createTable(table, {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'tenantId',
      references: { model: 'tenants', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'userId',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    theme: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'system',
    },
    primaryColor: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#1677ff',
      field: 'primaryColor',
    },
    language: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: 'en',
    },
    density: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: 'default',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'createdBy',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'updatedBy',
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updatedAt',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deletedAt',
    },
  });

  // Unique constraint: one appearance settings row per user per tenant (excluding soft-deleted)
  await sequelize.query(`
    CREATE UNIQUE INDEX "uq_user_appearance_tenant_user"
    ON "user_appearance_settings" ("tenantId", "userId")
    WHERE "deletedAt" IS NULL
  `);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.dropTable({ tableName: 'user_appearance_settings', schema: 'public' });
}
