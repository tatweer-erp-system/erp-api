import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('admin_notifications', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    adminId: { type: DataTypes.UUID, allowNull: false },
    type: { type: DataTypes.STRING(100), allowNull: false },
    titleEn: { type: DataTypes.STRING(255), allowNull: false },
    titleAr: { type: DataTypes.STRING(255), allowNull: false },
    bodyEn: { type: DataTypes.TEXT, allowNull: true },
    bodyAr: { type: DataTypes.TEXT, allowNull: true },
    data: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    readAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
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

  await qi.addIndex('admin_notifications', ['adminId']);
  await qi.addIndex('admin_notifications', ['adminId', 'isRead']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('admin_notifications');
}
