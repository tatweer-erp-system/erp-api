import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  await qi.createTable(
    { tableName: 'user_tenant_mappings', schema: 'public' },
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      email: { type: DataTypes.STRING(255), allowNull: false },
      tenant_slug: { type: DataTypes.STRING(100), allowNull: false },
      user_id: { type: DataTypes.UUID, allowNull: false },
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false },
    },
  );

  await sequelize.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_tenant_mappings_email_tenant_slug" ON public.user_tenant_mappings (email, tenant_slug)`,
  );
  await sequelize.query(
    `CREATE INDEX IF NOT EXISTS "user_tenant_mappings_email" ON public.user_tenant_mappings (email)`,
  );
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  await sequelize.getQueryInterface().dropTable({
    tableName: 'user_tenant_mappings',
    schema: 'public',
  });
}
