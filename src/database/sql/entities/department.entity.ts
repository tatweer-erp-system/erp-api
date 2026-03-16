import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';

@Entity('departments')
export class Department extends BaseEntity {
  @ApiProperty({ example: 'Engineering' })
  @Column({ name: 'name_en', type: 'varchar', length: 255 })
  nameEn: string;

  @ApiProperty({ example: 'الهندسة' })
  @Column({ name: 'name_ar', type: 'varchar', length: 255 })
  nameAr: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
