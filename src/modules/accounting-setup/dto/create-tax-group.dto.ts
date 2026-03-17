import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateTaxGroupDto {
  @ApiProperty({ description: 'Tax group name in English', example: 'VAT' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ description: 'Tax group name in Arabic', example: 'ضريبة القيمة المضافة' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;
}
