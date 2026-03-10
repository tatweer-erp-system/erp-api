import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsUUID, IsNotEmpty, IsIn } from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ example: 'New Enterprise Deal' })
  @IsString()
  @IsNotEmpty()
  title_en!: string;

  @ApiProperty({ example: 'صفقة مؤسسية جديدة' })
  @IsString()
  @IsNotEmpty()
  title_ar!: string;

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

  @ApiPropertyOptional({ enum: ['website', 'referral', 'social_media', 'cold_call', 'other'] })
  @IsOptional()
  @IsIn(['website', 'referral', 'social_media', 'cold_call', 'other'])
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
