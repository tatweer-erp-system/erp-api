import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { TreasuryAccountType } from '@/common/enums/accounting.enums';

export class CreateTreasuryAccountDto {
  @ApiProperty({ example: { en: 'Cash Box', ar: 'صندوق النقد' } })
  @IsObject()
  name!: { en: string; ar: string };

  @ApiProperty({ enum: TreasuryAccountType })
  @IsEnum(TreasuryAccountType)
  type!: TreasuryAccountType;

  @ApiPropertyOptional({ example: 'SAR' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coaAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Bank-specific fields (only for type = BANK)
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Saudi IBAN: SA followed by 22 digits' })
  @IsOptional()
  @IsString()
  @Matches(/^SA\d{22}$/, { message: 'IBAN must be SA followed by 22 digits' })
  iban?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(11)
  swiftCode?: string;
}
