import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenants',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Tenant extends BaseEntity<Tenant> {
  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  slug!: string;

  @Column({ type: DataType.STRING(50), defaultValue: 'trial' })
  status!: string;

  @Column({ type: DataType.DATE, allowNull: true })
  trialEndsAt!: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  suspendedAt!: Date | null;

  @Column({ type: DataType.STRING(255), allowNull: true })
  suspendReason!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
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
}
