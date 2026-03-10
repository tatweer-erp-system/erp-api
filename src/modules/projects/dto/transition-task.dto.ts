import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsIn } from 'class-validator';

export class TransitionTaskDto {
  @ApiProperty({
    description: 'Target status',
    enum: ['todo', 'in_progress', 'in_review', 'done', 'cancelled'],
  })
  @IsNotEmpty()
  @IsIn(['todo', 'in_progress', 'in_review', 'done', 'cancelled'])
  status!: string;
}
