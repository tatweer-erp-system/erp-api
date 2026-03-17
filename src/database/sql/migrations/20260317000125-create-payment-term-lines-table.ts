import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('payment_term_lines', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    paymentTermId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'payment_terms', key: 'id' },
      onDelete: 'CASCADE',
    },
    sequence: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    type: { type: DataTypes.STRING(20), allowNull: false },
    value: { type: DataTypes.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
    days: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    dayOfMonth: { type: DataTypes.INTEGER, allowNull: true },
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

  await qi.addIndex('payment_term_lines', ['tenantId']);
  await qi.addIndex('payment_term_lines', ['paymentTermId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('payment_term_lines');
}
