import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable('journal_entries', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    tenantId: { type: DataTypes.UUID, allowNull: false },
    entryNumber: { type: DataTypes.STRING(50), allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'manual' },
    description: { type: DataTypes.TEXT, allowNull: true },
    referenceId: { type: DataTypes.UUID, allowNull: true },
    referenceType: { type: DataTypes.STRING(50), allowNull: true },
    reversedBy: { type: DataTypes.UUID, allowNull: true },
    reversalOf: { type: DataTypes.UUID, allowNull: true },
    isPosted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    postedBy: { type: DataTypes.UUID, allowNull: true },
    postedAt: { type: 'TIMESTAMPTZ' as any, allowNull: true },
    periodId: { type: DataTypes.BIGINT, allowNull: true },
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

  await qi.addIndex('journal_entries', ['tenantId']);
  await qi.addIndex('journal_entries', ['tenantId', 'entryNumber']);
  await qi.addIndex('journal_entries', ['periodId']);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable('journal_entries');
}
