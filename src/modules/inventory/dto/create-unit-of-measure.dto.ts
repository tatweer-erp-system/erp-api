import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { UomType } from '@/common/enums/definitions.enums';

export class CreateUnitOfMeasureDto {
  @ApiProperty({ example: 'Kilogram' })
  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @ApiProperty({ example: 'كيلوغرام' })
  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @MaxLength(20)
  symbol!: string;

  @ApiPropertyOptional({ enum: UomType, default: UomType.UNIT })
  @IsOptional()
  @IsEnum(UomType)
  uomType?: UomType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
