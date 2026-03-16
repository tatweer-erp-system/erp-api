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
  tableName: 'user_preferences',
  timestamps: true,
  paranoid: false,
  schema: 'public',
})
export class UserPreference extends Model<UserPreference> {
  @PrimaryKey
  @Column({ type: DataType.UUID, defaultValue: () => uuidv7() })
  id!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  userId!: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  key!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  value!: string | null;

  @CreatedAt
  @Column({ type: DataType.DATE })
  createdAt!: Date;

  @UpdatedAt
  @Column({ type: DataType.DATE })
  updatedAt!: Date;

  @BeforeCreate
  static generateUUID(instance: UserPreference) {
    if (!instance.id) {
      instance.id = uuidv7();
    }
  }
}
