import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateTreasuryAccountDto {
  @ApiPropertyOptional({ example: { en: 'Main Cash', ar: 'النقد الرئيسي' } })
  @IsOptional()
  @IsObject()
  name?: { en: string; ar: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  coaAccountId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
