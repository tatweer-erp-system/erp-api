import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { FiscalPeriodStatus } from '@/common/enums/accounting.enums';

@Entity('fiscal_periods')
export class FiscalPeriod extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en', nullable: false })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar', nullable: false })
  nameAr: string;

  @Column({ type: 'date', name: 'start_date', nullable: false })
  startDate: string;

  @Column({ type: 'date', name: 'end_date', nullable: false })
  endDate: string;

  @Column({
    type: 'enum',
    enum: FiscalPeriodStatus,
    default: FiscalPeriodStatus.OPEN,
  })
  status: FiscalPeriodStatus;
}
