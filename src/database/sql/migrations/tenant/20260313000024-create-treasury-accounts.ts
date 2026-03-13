import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('treasury_accounts', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'branches', key: 'id' },
      onDelete: 'SET NULL',
    },
    name: { type: DataTypes.JSONB, allowNull: false, defaultValue: { en: '', ar: '' } },
    type: { type: DataTypes.STRING(20), allowNull: false },
    bankName: { type: DataTypes.STRING(100), allowNull: true },
    accountNumber: { type: DataTypes.STRING(50), allowNull: true },
    iban: { type: DataTypes.STRING(34), allowNull: true },
    swiftCode: { type: DataTypes.STRING(11), allowNull: true },
    currency: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'SAR' },
    currentBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0.0 },
    coaAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'chart_of_accounts', key: 'id' },
      onDelete: 'SET NULL',
    },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
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

  await qi.addIndex('treasury_accounts', ['tenantId']);
  await qi.addIndex('treasury_accounts', ['type']);
  await qi.addIndex('treasury_accounts', ['isActive']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('treasury_accounts');
}
