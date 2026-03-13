import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  BeforeCreate,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'table_sessions',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class TableSession extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  tableId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  orderId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 1 })
  guestCount!: number;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  seatedAt!: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  releasedAt!: Date | null;

  @Column({ type: DataType.DECIMAL(15, 2), allowNull: true, defaultValue: 0.0 })
  totalRevenue!: number | null;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  version!: number;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;

  @BeforeCreate
  static generateUUID(instance: TableSession) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
