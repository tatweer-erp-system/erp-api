import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { TaskStatus } from '@/common/enums/project.enums';

export class TransitionTaskDto {
  @ApiProperty({
    description: 'Target status',
    enum: TaskStatus,
  })
  @IsNotEmpty()
  @IsEnum(TaskStatus)
  status!: TaskStatus;
}
