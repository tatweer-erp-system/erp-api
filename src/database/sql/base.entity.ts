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

export abstract class BaseEntity<T extends {} = any> extends Model<T> {
  @PrimaryKey
  @Column({
    type: DataType.UUID,
    defaultValue: () => uuidv7(),
  })
  id!: string;

  @CreatedAt
  @Column({ type: DataType.DATE, field: 'created_at' })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE, field: 'updated_at' })
  updatedAt!: Date;

  @DeletedAt
  @Column({ type: DataType.DATE, field: 'deleted_at' })
  deletedAt!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
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

export abstract class TenantAwareEntity<T extends {} = any> extends BaseEntity<T> {
  @Column({ type: DataType.UUID, allowNull: false, field: 'tenant_id' })
  tenantId!: string;
}
