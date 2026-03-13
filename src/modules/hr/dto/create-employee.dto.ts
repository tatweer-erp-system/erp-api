import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsDateString } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'User ID (FK to users table)', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Department ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  departmentId!: string;

  @ApiProperty({ description: 'First name in English', example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstNameEn!: string;

  @ApiProperty({ description: 'First name in Arabic', example: 'جون' })
  @IsNotEmpty()
  @IsString()
  firstNameAr!: string;

  @ApiProperty({ description: 'Last name in English', example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastNameEn!: string;

  @ApiProperty({ description: 'Last name in Arabic', example: 'دو' })
  @IsNotEmpty()
  @IsString()
  lastNameAr!: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+966500000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'National ID (will be encrypted)' })
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'IBAN (will be encrypted)' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ description: 'Bank account number (will be encrypted)' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Basic salary (will be encrypted)', example: 10000 })
  @IsOptional()
  @IsNumber()
  basicSalary?: number;

  @ApiProperty({ description: 'Hire date (ISO date)', example: '2024-01-15' })
  @IsNotEmpty()
  @IsDateString()
  hireDate!: string;

  @ApiPropertyOptional({ description: 'Job title in English', example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  jobTitleEn?: string;

  @ApiPropertyOptional({ description: 'Job title in Arabic', example: 'مهندس برمجيات' })
  @IsOptional()
  @IsString()
  jobTitleAr?: string;

  @ApiPropertyOptional({ description: 'Manager ID (UUID)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({
    description: 'Branch ID (defaults to tenant default branch)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
