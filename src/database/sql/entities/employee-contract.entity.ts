import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { WageType, ContractStatus } from '@/common/enums/hr.enums';

@Entity('employee_contracts')
export class EmployeeContract extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string;

  @ApiProperty({ example: 'uuid' })
  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'CTR-0001', nullable: true })
  @Column({ name: 'reference', type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @ApiProperty({ example: '2025-01-01' })
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @ApiProperty({ example: '2025-12-31', nullable: true })
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'structure_id', type: 'uuid', nullable: true })
  structureId: string | null;

  @ApiProperty({ example: '5000.0000' })
  @Column({ name: 'wage', type: 'decimal', precision: 20, scale: 4 })
  wage: string;

  @ApiProperty({ enum: WageType, default: WageType.MONTHLY })
  @Column({ name: 'wage_type', type: 'enum', enum: WageType, default: WageType.MONTHLY })
  wageType: WageType;

  @ApiProperty({ example: 'Standard 40h', nullable: true })
  @Column({ name: 'work_schedule', type: 'varchar', length: 100, nullable: true })
  workSchedule: string | null;

  @ApiProperty({ enum: ContractStatus, default: ContractStatus.DRAFT })
  @Column({ name: 'status', type: 'enum', enum: ContractStatus, default: ContractStatus.DRAFT })
  status: ContractStatus;

  @ApiProperty({ nullable: true })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;
}
