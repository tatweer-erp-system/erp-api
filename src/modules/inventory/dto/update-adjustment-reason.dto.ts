import { PartialType } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateAdjustmentReasonDto } from './create-adjustment-reason.dto';

export class UpdateAdjustmentReasonDto extends PartialType(CreateAdjustmentReasonDto) {
  @ApiProperty({ example: 1 })
  @IsNumber()
  version!: number;
}
