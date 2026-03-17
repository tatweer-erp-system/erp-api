import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateAttributeValueDto {
  @ApiProperty()
  @IsUUID()
  attributeValueId!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceExtra?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AddTemplateAttributeDto {
  @ApiProperty()
  @IsUUID()
  attributeId!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sequence?: number;

  @ApiProperty({ type: [TemplateAttributeValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateAttributeValueDto)
  values!: TemplateAttributeValueDto[];
}
