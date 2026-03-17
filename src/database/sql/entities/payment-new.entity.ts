import { Column, DataType, Default, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { PaymentTypeNew, PaymentStatusNew } from '@/common/enums/invoice.enums';

@Table({ tableName: 'payments', timestamps: true, paranoid: true, schema: 'public' })
export class PaymentNew extends TenantAwareEntity<PaymentNew> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.UUID, allowNull: true })
  journalId!: string | null;

  @Column({ type: DataType.UUID, allowNull: false })
  partnerId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false })
  paymentType!: PaymentTypeNew;

  @Default(PaymentStatusNew.DRAFT)
  @Column({ type: DataType.STRING(20), allowNull: false })
  status!: PaymentStatusNew;

  @Column({ type: DataType.STRING(50), allowNull: true })
  paymentNumber!: string | null;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  paymentDate!: string;

  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amount!: number;

  @Column({ type: DataType.UUID, allowNull: true })
  currencyId!: string | null;

  @Default(1)
  @Column({ type: DataType.DECIMAL(18, 6), allowNull: false })
  exchangeRate!: number;

  @Default(0)
  @Column({ type: DataType.DECIMAL(18, 2), allowNull: false })
  amountBase!: number;

  @Column({ type: DataType.STRING(500), allowNull: true })
  memo!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  journalEntryId!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  treasuryAccountId!: string | null;
}
