import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // Add updatedBy to gift_cards
  await qi.addColumn('gift_cards', 'updatedBy', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  });

  // Add updatedBy to cash_movements
  await qi.addColumn('cash_movements', 'updatedBy', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  });

  // Add updatedBy to pos_held_orders
  await qi.addColumn('pos_held_orders', 'updatedBy', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  });

  // Add updatedBy to pos_refunds
  await qi.addColumn('pos_refunds', 'updatedBy', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'SET NULL',
  });
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('pos_refunds', 'updatedBy');
  await qi.removeColumn('pos_held_orders', 'updatedBy');
  await qi.removeColumn('cash_movements', 'updatedBy');
  await qi.removeColumn('gift_cards', 'updatedBy');
}
