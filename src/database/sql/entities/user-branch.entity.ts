import {
  Column,
  DataType,
  Table,
  Model,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  BeforeCreate,
} from 'sequelize-typescript';
import { v7 as uuidv7 } from 'uuid';

@Table({
  tableName: 'user_branches',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class UserBranch extends Model<UserBranch> {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  tenantId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  isDefault!: boolean;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;

  @BeforeCreate
  static generateUUID(instance: UserBranch) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
