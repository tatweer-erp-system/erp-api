import { Column, DataType, Table, Default, PrimaryKey, CreatedAt, UpdatedAt, Model } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table({ tableName: 'tenant_onboarding', schema: 'public', timestamps: true, paranoid: false, underscored: true })
export class TenantOnboarding extends Model {
  @PrimaryKey
  @Default(uuidv4)
  @Column(DataType.UUID)
  id!: string;

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

  @CreatedAt @Column(DataType.DATE) createdAt!: Date;
  @UpdatedAt @Column(DataType.DATE) updatedAt!: Date;
}
