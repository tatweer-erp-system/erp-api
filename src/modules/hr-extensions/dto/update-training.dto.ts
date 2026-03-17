import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateTrainingDto } from './create-training.dto';

export class UpdateTrainingDto extends PartialType(
  OmitType(CreateTrainingDto, ['employeeId'] as const),
) {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;
}
