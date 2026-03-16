import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/database/sql/base.entity';
import { StructureType } from '@/common/enums/payroll.enums';

@Entity({ name: 'salary_structures' })
export class SalaryStructure extends BaseEntity {
  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn: string;

  @Column({ type: 'varchar', length: 255, name: 'name_ar' })
  nameAr: string;

  @Column({
    type: 'enum',
    enum: StructureType,
    name: 'structure_type',
    default: StructureType.EMPLOYEE,
  })
  structureType: StructureType;

  @Column({ type: 'uuid', name: 'parent_structure_id', nullable: true })
  parentStructureId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}
