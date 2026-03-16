import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { CrmStageType } from '@/common/enums/crm.enums';

@Entity({ name: 'crm_stages' })
export class CrmStage extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({ type: 'int', default: 10 })
  sequence: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  probability: number;

  @Column({ type: 'enum', enum: CrmStageType, name: 'stage_type', default: CrmStageType.PIPELINE })
  stageType: CrmStageType;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
