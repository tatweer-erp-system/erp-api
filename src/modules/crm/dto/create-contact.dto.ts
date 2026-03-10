import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName_en!: string;

  @ApiProperty({ example: 'جون' })
  @IsString()
  @IsNotEmpty()
  firstName_ar!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName_en!: string;

  @ApiProperty({ example: 'دو' })
  @IsString()
  @IsNotEmpty()
  lastName_ar!: string;

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
  company_en?: string;

  @ApiPropertyOptional({ example: 'شركة أكمي' })
  @IsOptional()
  @IsString()
  company_ar?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['customer', 'vendor', 'both'], default: 'customer' })
  @IsOptional()
  @IsIn(['customer', 'vendor', 'both'])
  type?: 'customer' | 'vendor' | 'both';
}
