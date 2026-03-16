import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('exchange_rates')
@Index(['currencyId', 'date'])
export class ExchangeRate extends BaseEntity {
  @Column({ type: 'uuid', name: 'currency_id', nullable: false })
  currencyId: string;

  @Column({ type: 'date', nullable: false })
  date: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: false })
  rate: number;
}
