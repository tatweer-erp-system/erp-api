import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { ReceiptStatus } from '@/common/enums/purchasing.enums';

@Entity('receipts')
export class Receipt extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'REC/HQ/2025/0001', nullable: true })
  @Column({ name: 'reference', type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'purchase_order_id', type: 'uuid', nullable: true })
  purchaseOrderId: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null;

  @ApiProperty({ example: '2025-01-30', nullable: true })
  @Column({ name: 'scheduled_date', type: 'date', nullable: true })
  scheduledDate: string | null;

  @ApiProperty({ nullable: true })
  @Column({ name: 'done_date', type: 'date', nullable: true })
  doneDate: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'responsible_id', type: 'uuid', nullable: true })
  responsibleId: string | null;

  @ApiProperty({ enum: ReceiptStatus, default: ReceiptStatus.READY })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ReceiptStatus,
    default: ReceiptStatus.READY,
  })
  status: ReceiptStatus;
}
