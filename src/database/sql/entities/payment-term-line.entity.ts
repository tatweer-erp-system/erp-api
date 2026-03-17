import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PaymentTermLineType } from '@/common/enums/accounting-new.enums';

@Table({
  tableName: 'payment_term_lines',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class PaymentTermLine extends TenantAwareEntity<PaymentTermLine> {
  @Column({ type: DataType.UUID, allowNull: false })
  paymentTermId!: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  sequence!: number;

  @Column({ type: DataType.STRING(20), allowNull: false })
  type!: PaymentTermLineType;

  @Column({ type: DataType.DECIMAL(8, 2), allowNull: false, defaultValue: 0 })
  value!: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  days!: number;

  @Column({ type: DataType.INTEGER, allowNull: true })
  dayOfMonth!: number | null;
}
