import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenant_onboarding',
  schema: 'public',
  timestamps: true,
  paranoid: false,
})
export class TenantOnboarding extends BaseEntity<TenantOnboarding> {
  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  tenantSlug!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  logoUploaded!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  firstUserCreated!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  firstEmployeeAdded!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  firstProductAdded!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  firstInvoiceCreated!: boolean;

  @Column({ type: DataType.DATE, allowNull: true })
  completedAt!: Date | null;
}
