import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTrainingDto } from './create-training.dto';

export class UpdateTrainingDto extends PartialType(
  OmitType(CreateTrainingDto, ['employeeId'] as const),
) {}
