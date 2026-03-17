import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { JournalType } from '@/common/enums/accounting-new.enums';

export class CreateJournalDto {
  @ApiProperty({ description: 'Journal name in English', example: 'Sales Journal' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Journal name in Arabic', example: 'دفتر يومية المبيعات' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ enum: JournalType, description: 'Journal type' })
  @IsEnum(JournalType)
  type!: JournalType;

  @ApiProperty({ example: 'SAL', description: 'Unique journal code per tenant' })
  @IsString()
  @MaxLength(10)
  code!: string;

  @ApiPropertyOptional({ description: 'Default debit/credit account ID' })
  @IsOptional()
  @IsUUID()
  defaultAccountId?: string;

  @ApiPropertyOptional({ description: 'Suspense account ID' })
  @IsOptional()
  @IsUUID()
  suspenseAccountId?: string;

  @ApiPropertyOptional({ description: 'Currency ID (FK to currencies)' })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiPropertyOptional({ description: 'Prefix for sequence numbering', example: 'INV' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sequencePrefix?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}
