import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '@/database/sql/base.entity';
import { Gender, MaritalStatus } from '@/common/enums/hr.enums';

@Entity('employees')
export class Employee extends BaseEntity {
  @ApiProperty({ example: 'uuid' })
  @Index()
  @Column({ name: 'branch_id', type: 'uuid' })
  branchId: string;

  @ApiProperty({ example: 'John Doe' })
  @Column({ name: 'name_en', type: 'varchar', length: 255 })
  nameEn: string;

  @ApiProperty({ example: 'جون دو' })
  @Column({ name: 'name_ar', type: 'varchar', length: 255 })
  nameAr: string;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'job_title_id', type: 'uuid', nullable: true })
  jobTitleId: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @ApiProperty({ example: 'john.doe@company.com', nullable: true })
  @Column({ name: 'work_email', type: 'varchar', length: 255, nullable: true })
  workEmail: string | null;

  @ApiProperty({ example: '+966501234567', nullable: true })
  @Column({ name: 'work_phone', type: 'varchar', length: 50, nullable: true })
  workPhone: string | null;

  @ApiProperty({ example: '+966501234567', nullable: true })
  @Column({ name: 'mobile', type: 'varchar', length: 50, nullable: true })
  mobile: string | null;

  @ApiProperty({ example: '1234567890', nullable: true })
  @Column({ name: 'national_id', type: 'varchar', length: 100, nullable: true })
  nationalId: string | null;

  @ApiProperty({ example: '1990-01-15', nullable: true })
  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate: string | null;

  @ApiProperty({ enum: Gender, nullable: true })
  @Column({ name: 'gender', type: 'enum', enum: Gender, nullable: true })
  gender: Gender | null;

  @ApiProperty({ enum: MaritalStatus, nullable: true })
  @Column({ name: 'marital_status', type: 'enum', enum: MaritalStatus, nullable: true })
  maritalStatus: MaritalStatus | null;

  @ApiProperty({ example: 'uuid', nullable: true })
  @Column({ name: 'linked_user_id', type: 'uuid', nullable: true })
  linkedUserId: string | null;

  @ApiProperty({ example: 'EMP-0001', nullable: true })
  @Column({ name: 'employee_code', type: 'varchar', length: 50, nullable: true })
  employeeCode: string | null;

  @ApiProperty({ example: '1234', nullable: true })
  @Column({ name: 'pin', type: 'varchar', length: 20, nullable: true })
  pin: string | null;

  @ApiProperty({ example: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
