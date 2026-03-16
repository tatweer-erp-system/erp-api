import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateRejectionReasonDto } from './create-rejection-reason.dto';

export class UpdateRejectionReasonDto extends PartialType(CreateRejectionReasonDto) {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;
}
