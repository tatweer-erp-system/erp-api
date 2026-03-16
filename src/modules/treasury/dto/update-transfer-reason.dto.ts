import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateTransferReasonDto } from './create-transfer-reason.dto';

export class UpdateTransferReasonDto extends PartialType(CreateTransferReasonDto) {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;
}
