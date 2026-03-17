import { Column, DataType, Default, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { DownPaymentType } from '@/common/enums/pricelist.enums';

@Table({
  tableName: 'down_payments',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class DownPayment extends TenantAwareEntity<DownPayment> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: false })
  saleOrderId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  invoiceId!: string | null;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: DownPaymentType;

  @Column({ type: DataType.DECIMAL(18, 4), allowNull: false })
  value!: number;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amount!: number;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  isDeducted!: boolean;
}
