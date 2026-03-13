import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsUUID, IsNotEmpty, IsEnum } from 'class-validator';
import { LeadSource } from '@/common/enums/crm.enums';

export class CreateLeadDto {
  @ApiProperty({ example: 'New Enterprise Deal' })
  @IsString()
  @IsNotEmpty()
  titleEn!: string;

  @ApiProperty({ example: 'صفقة مؤسسية جديدة' })
  @IsString()
  @IsNotEmpty()
  titleAr!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  estimatedValue?: number;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
