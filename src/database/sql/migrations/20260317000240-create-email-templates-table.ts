import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('email_templates', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    nameEn: { type: DataTypes.STRING(255), allowNull: false },
    nameAr: { type: DataTypes.STRING(255), allowNull: false },
    model: { type: DataTypes.STRING(50), allowNull: false },
    subject: { type: DataTypes.STRING(500), allowNull: false },
    bodyEn: { type: DataTypes.TEXT, allowNull: false },
    bodyAr: { type: DataTypes.TEXT, allowNull: false },
    fromEmail: { type: DataTypes.STRING(255), allowNull: true },
    replyTo: { type: DataTypes.STRING(255), allowNull: true },
    autoAttachPdf: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    ccEmails: { type: DataTypes.STRING(500), allowNull: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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

  await qi.addIndex('email_templates', ['tenantId']);
  await qi.addIndex('email_templates', ['tenantId', 'model']);
  await qi.addIndex('email_templates', ['tenantId', 'model', 'isDefault']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('email_templates');
}
