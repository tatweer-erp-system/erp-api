import {
  BeforeCreate,
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'pos_held_orders',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class PosHeldOrder extends Model {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  sessionId!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  tabLabel!: string;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  cartSnapshot!: Record<string, unknown>[];

  @Column({ type: DataType.UUID, allowNull: false })
  createdBy!: string;

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
  static generateUUID(instance: PosHeldOrder) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
