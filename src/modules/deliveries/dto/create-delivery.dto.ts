import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDeliveryLineDto } from './create-delivery-line.dto';

export class CreateDeliveryDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  saleOrderId?: string;

  @ApiProperty()
  @IsUUID()
  partnerId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateDeliveryLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryLineDto)
  lines!: CreateDeliveryLineDto[];
}
