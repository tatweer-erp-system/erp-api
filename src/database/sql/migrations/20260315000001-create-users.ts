import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('users', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    firstNameEn: { type: DataTypes.STRING(100), allowNull: false },
    firstNameAr: { type: DataTypes.STRING(100), allowNull: false },
    lastNameEn: { type: DataTypes.STRING(100), allowNull: false },
    lastNameAr: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    avatarUrl: { type: DataTypes.STRING(500), allowNull: true },
    preferredLang: { type: DataTypes.STRING(5), allowNull: false, defaultValue: 'en' },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    lastLoginAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    failedLoginAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lockedUntil: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    pinHash: { type: DataTypes.STRING(255), allowNull: true },
    extraPermissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    revokedPermissions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
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

  await qi.addIndex('users', ['email'], { unique: true });
  await qi.addIndex('users', ['tenantId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('users');
}
