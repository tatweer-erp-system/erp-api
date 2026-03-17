import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsBoolean, IsOptional, IsUUID, IsInt, MaxLength } from 'class-validator';
import { JournalType } from '@/common/enums/accounting-new.enums';

export class UpdateJournalDto {
  @ApiPropertyOptional({ description: 'Journal name in English' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameEn?: string;

  @ApiPropertyOptional({ description: 'Journal name in Arabic' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nameAr?: string;

  @ApiPropertyOptional({ enum: JournalType })
  @IsOptional()
  @IsEnum(JournalType)
  type?: JournalType;

  @ApiPropertyOptional({ description: 'Unique journal code per tenant' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;

  @ApiPropertyOptional({ description: 'Default debit/credit account ID' })
  @IsOptional()
  @IsUUID()
  defaultAccountId?: string | null;

  @ApiPropertyOptional({ description: 'Suspense account ID' })
  @IsOptional()
  @IsUUID()
  suspenseAccountId?: string | null;

  @ApiPropertyOptional({ description: 'Currency ID (FK to currencies)' })
  @IsOptional()
  @IsUUID()
  currencyId?: string | null;

  @ApiPropertyOptional({ description: 'Prefix for sequence numbering' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  sequencePrefix?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Optimistic lock version' })
  @IsInt()
  version!: number;
}
