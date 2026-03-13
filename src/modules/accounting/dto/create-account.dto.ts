import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { AccountType, NormalBalance } from '@/common/enums/accounting.enums';

export class CreateAccountDto {
  @ApiProperty({ example: '1100' })
  @IsString()
  @MaxLength(20)
  code!: string;

  @ApiProperty({ example: { en: 'Cash and Cash Equivalents', ar: 'النقد وما يعادله' } })
  nameEn!: string;

  @ApiProperty()
  nameAr!: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  subType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ enum: NormalBalance })
  @IsEnum(NormalBalance)
  normalBalance!: NormalBalance;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowDirectPosting?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  openingBalanceDate?: string;

  @ApiPropertyOptional({ default: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string = 'SAR';
}
