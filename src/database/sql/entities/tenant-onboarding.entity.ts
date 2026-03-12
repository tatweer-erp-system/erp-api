import { Column, DataType, Table } from 'sequelize-typescript';
import { BaseEntity } from '../base.entity';

@Table({
  tableName: 'tenant_onboarding',
  schema: 'public',
  timestamps: true,
  paranoid: false,
  underscored: true,
})
export class TenantOnboarding extends BaseEntity<TenantOnboarding> {
  @Column({ type: DataType.STRING(100), allowNull: false, unique: true, field: 'tenant_slug' })
  tenantSlug!: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'logo_uploaded' })
  logoUploaded!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'first_user_created' })
  firstUserCreated!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'first_employee_added' })
  firstEmployeeAdded!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'first_product_added' })
  firstProductAdded!: boolean;

  @Column({ type: DataType.BOOLEAN, defaultValue: false, field: 'first_invoice_created' })
  firstInvoiceCreated!: boolean;

  @Column({ type: DataType.DATE, allowNull: true, field: 'completed_at' })
  completedAt!: Date | null;
}
