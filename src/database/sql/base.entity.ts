import {
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  UpdatedAt,
  BeforeCreate,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

export abstract class BaseEntity<T extends object = object> extends Model<T> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: () => uuidv7(),
  })
  id!: string;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;

  @DeletedAt
  @Column({ type: DataType.DATE })
  deletedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  updatedBy!: string | null;

  @Default(0)
  @Column({ type: DataType.INTEGER, allowNull: false })
  version!: number;

  @BeforeCreate
  static generateUUID(instance: BaseEntity) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}

export abstract class TenantAwareEntity<T extends object = object> extends BaseEntity<T> {
  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;
}
