import { MigrationParams } from 'umzug';
import { Sequelize } from 'sequelize';

const SUPER_ADMIN_ID = '00000000-0000-0000-0000-000000000001';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  const [existing] = await sequelize.query(
    `SELECT id FROM admins WHERE email = 'admin@tatweer.com' LIMIT 1`,
  );
  if ((existing as any[]).length > 0) return;

  const now = new Date();

  // Pre-computed bcrypt hash for 'Admin@123456'
  const passwordHash = '$2b$10$iFNvNDNSbbQw1Bb/NkkmRu9QgTrLzul9jUnspozZ3SYfhANM/U8lW';

  await qi.bulkInsert('admins', [
    {
      id: SUPER_ADMIN_ID,
      email: 'admin@tatweer.com',
      passwordHash: passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  await qi.bulkDelete('admins', { id: SUPER_ADMIN_ID } as any);
}
