import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('gift_cards', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: false },
    initialBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currentBalance: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    currency: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'SAR' },
    recipientName: { type: DataTypes.STRING(200), allowNull: true },
    recipientEmail: { type: DataTypes.STRING(200), allowNull: true },
    recipientPhone: { type: DataTypes.STRING(30), allowNull: true },
    issuedBy: { type: DataTypes.UUID, allowNull: true },
    issuedOrderId: { type: DataTypes.UUID, allowNull: true },
    issuedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    expiresAt: { type: DataTypes.DATEONLY, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: true },
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

  await qi.addIndex('gift_cards', ['tenantId']);
  await qi.addIndex('gift_cards', ['tenantId', 'code'], { unique: true });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('gift_cards');
}
