import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Gender, MaritalStatus, EmploymentType } from '@/common/enums/hr.enums';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'User ID (FK to users table)', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Employee name in English', example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Employee name in Arabic', example: 'جون دو' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiPropertyOptional({ description: 'Employee code (unique identifier)', example: 'EMP-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeCode?: string;

  @ApiProperty({ description: 'Department ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  departmentId!: string;

  @ApiPropertyOptional({ description: 'Job Position ID (FK to job_positions)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  jobPositionId?: string;

  @ApiPropertyOptional({
    description: 'Branch ID (defaults to tenant default branch)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Manager ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Employment type',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiProperty({ description: 'Hire date (ISO date)', example: '2024-01-15' })
  @IsNotEmpty()
  @IsDateString()
  hireDate!: string;

  @ApiPropertyOptional({ description: 'National ID' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  nationalId?: string;

  @ApiPropertyOptional({ description: 'Birth date (ISO date)', example: '1990-01-01' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Gender', enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Marital status', enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({ description: 'Nationality', example: 'SA' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nationality?: string;

  @ApiPropertyOptional({ description: 'Is Saudi national (auto-detected from nationality)' })
  @IsOptional()
  @IsBoolean()
  isSaudi?: boolean;

  @ApiPropertyOptional({ description: 'Emergency contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  emergencyContact?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyPhone?: string;

  @ApiPropertyOptional({ description: 'Bank account number / IBAN' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;
}
