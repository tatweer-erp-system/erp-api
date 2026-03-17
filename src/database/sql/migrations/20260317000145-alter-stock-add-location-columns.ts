import { MigrationParams } from 'umzug';
import { Sequelize, DataTypes } from 'sequelize';

export async function up({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // ── stock_levels additions ──────────────────────────────────────────────────

  try {
    await qi.addColumn('stock_levels', 'locationId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_levels', 'productVariantId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_levels', 'lotNumber', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_levels', 'serialNumber', {
      type: DataTypes.STRING(100),
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_levels', 'expiryDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  // ── stock_movements additions ───────────────────────────────────────────────

  try {
    await qi.addColumn('stock_movements', 'fromLocationId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_movements', 'toLocationId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_movements', 'productVariantId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_movements', 'originModel', {
      type: DataTypes.STRING(50),
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }

  try {
    await qi.addColumn('stock_movements', 'originId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  } catch {
    /* column may already exist */
  }
}

export async function down({ context: sequelize }: MigrationParams<Sequelize>): Promise<void> {
  const qi = sequelize.getQueryInterface();

  // stock_levels rollback
  try {
    await qi.removeColumn('stock_levels', 'locationId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_levels', 'productVariantId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_levels', 'lotNumber');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_levels', 'serialNumber');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_levels', 'expiryDate');
  } catch {
    /* ignore */
  }

  // stock_movements rollback
  try {
    await qi.removeColumn('stock_movements', 'fromLocationId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_movements', 'toLocationId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_movements', 'productVariantId');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_movements', 'originModel');
  } catch {
    /* ignore */
  }
  try {
    await qi.removeColumn('stock_movements', 'originId');
  } catch {
    /* ignore */
  }
}
