import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('invoice_line_taxes', {
    id: { type: DataTypes.UUID, primaryKey: true },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    invoiceLineId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'invoice_lines', key: 'id' },
      onDelete: 'CASCADE',
    },
    taxId: { type: DataTypes.UUID, allowNull: false },
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

  await qi.addIndex('invoice_line_taxes', ['invoiceLineId'], {
    name: 'idx_invoice_line_taxes_line',
  });
  await qi.addIndex('invoice_line_taxes', ['tenantId'], {
    name: 'idx_invoice_line_taxes_tenant',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.dropTable('invoice_line_taxes');
}
