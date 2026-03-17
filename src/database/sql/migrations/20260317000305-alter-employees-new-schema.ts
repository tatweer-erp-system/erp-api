import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'employees', schema: 'public' };

  try {
    await qi.addColumn(table, 'nameEn', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'nameAr', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'employeeCode', {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'jobPositionId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'nationalId', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'birthDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'gender', {
      type: DataTypes.STRING(10),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'maritalStatus', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'emergencyContact', {
      type: DataTypes.STRING(255),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'emergencyPhone', {
      type: DataTypes.STRING(20),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'bankAccount', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  try {
    await qi.addColumn(table, 'bankName', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  } catch (e) {
    /* column may already exist */
  }

  // Index
  try {
    await qi.addIndex(table, ['tenantId', 'jobPositionId'], {
      where: { deletedAt: null },
    });
  } catch (e) {
    /* index may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = { tableName: 'employees', schema: 'public' };

  await qi.removeColumn(table, 'bankName');
  await qi.removeColumn(table, 'bankAccount');
  await qi.removeColumn(table, 'emergencyPhone');
  await qi.removeColumn(table, 'emergencyContact');
  await qi.removeColumn(table, 'maritalStatus');
  await qi.removeColumn(table, 'gender');
  await qi.removeColumn(table, 'birthDate');
  await qi.removeColumn(table, 'nationalId');
  await qi.removeColumn(table, 'jobPositionId');
  await qi.removeColumn(table, 'employeeCode');
  await qi.removeColumn(table, 'nameAr');
  await qi.removeColumn(table, 'nameEn');
}
