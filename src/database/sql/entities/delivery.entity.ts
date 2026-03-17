import { Column, DataType, Table } from 'sequelize-typescript';
import { TenantAwareEntity } from '../base.entity';
import { DeliveryStatus } from '@/common/enums/inventory-new.enums';

@Table({
  tableName: 'deliveries',
  timestamps: true,
  paranoid: true,
  schema: 'public',
})
export class Delivery extends TenantAwareEntity<Delivery> {
  @Column({ type: DataType.UUID, allowNull: false })
  branchId!: string;

  @Column({ type: DataType.STRING(50), allowNull: true })
  reference!: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  saleOrderId!: string | null;

  @Column({ type: DataType.UUID, allowNull: false })
  partnerId!: string;

  @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: DeliveryStatus.DRAFT })
  status!: DeliveryStatus;

  @Column({ type: DataType.DATEONLY, allowNull: true })
  scheduledDate!: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  doneDate!: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  responsibleId!: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;
}
