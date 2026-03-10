import {
  Column,
  DataType,
  Table,
  Default,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Model,
} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({
  tableName: 'tenants',
  timestamps: true,
  paranoid: true,
  underscored: true,
  schema: 'public',
})
export class Tenant extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  slug!: string;

  @Column({ type: DataType.STRING(50), defaultValue: 'trial' })
  status!: string;

  @Column({ type: DataType.DATE, allowNull: true, field: 'trial_ends_at' })
  trialEndsAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'suspended_at' })
  suspendedAt!: Date | null;

  @Column({ type: DataType.STRING(255), allowNull: true, field: 'suspend_reason' })
  suspendReason!: string | null;

  @Column({ type: DataType.DATE, allowNull: true, field: 'cancelled_at' })
  cancelledAt!: Date | null;

  @Column({ type: DataType.JSONB, defaultValue: {} })
  settings!: Record<string, unknown>;

  @Column({
    type: DataType.JSONB,
    defaultValue: {
      hr: true,
      inventory: true,
      crm: true,
      purchasing: true,
      projects: true,
      chat: true,
      reporting: true,
    },
  })
  features!: Record<string, boolean>;

  @Column({ type: DataType.UUID, allowNull: true, field: 'created_by' })
  createdBy!: string | null;

  @Column({ type: DataType.UUID, allowNull: true, field: 'updated_by' })
  updatedBy!: string | null;

  @Default(0) @Column(DataType.INTEGER) version!: number;
  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
  @DeletedAt @Column(DataType.DATE) deletedAt!: Date | null;
}
