import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { ContactRole } from '@/common/enums/crm.enums';

export class CreateContactDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstNameEn!: string;

  @ApiProperty({ example: 'جون' })
  @IsString()
  @IsNotEmpty()
  firstNameAr!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastNameEn!: string;

  @ApiProperty({ example: 'دو' })
  @IsString()
  @IsNotEmpty()
  lastNameAr!: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+966501234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  companyEn?: string;

  @ApiPropertyOptional({ example: 'شركة أكمي' })
  @IsOptional()
  @IsString()
  companyAr?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ContactRole, default: 'customer' })
  @IsOptional()
  @IsEnum(ContactRole)
  type?: 'customer' | 'vendor' | 'both';
}
