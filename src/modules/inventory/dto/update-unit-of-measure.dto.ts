import { PartialType } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateUnitOfMeasureDto } from './create-unit-of-measure.dto';

export class UpdateUnitOfMeasureDto extends PartialType(CreateUnitOfMeasureDto) {
  @ApiProperty({ example: 1 })
  @IsNumber()
  version!: number;
}
