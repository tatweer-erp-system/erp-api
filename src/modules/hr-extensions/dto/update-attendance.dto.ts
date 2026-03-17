import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { CreateAttendanceDto } from './create-attendance.dto';

export class UpdateAttendanceDto extends PartialType(
  OmitType(CreateAttendanceDto, ['employeeId', 'date'] as const),
) {
  @ApiProperty({ description: 'Record version for optimistic locking' })
  @IsInt()
  @Min(0)
  version!: number;
}
