import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PaymentTermLineType } from '@/common/enums/inventory.enums';

@Entity({ name: 'payment_term_lines' })
export class PaymentTermLine {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'payment_term_id' }) paymentTermId: string;
  @Column({
    type: 'enum',
    enum: PaymentTermLineType,
    name: 'line_type',
    default: PaymentTermLineType.BALANCE,
  })
  lineType: PaymentTermLineType;
  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true }) value: number | null;
  @Column({ type: 'int', default: 0 }) days: number;
  @Column({ type: 'int', name: 'day_of_month', nullable: true }) dayOfMonth: number | null;
  @Column({ type: 'int', default: 0 }) sequence: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
