import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MinLength } from 'class-validator';

export class ResetSequenceDto {
  @ApiProperty({ description: 'Reason for resetting the sequence counter', minLength: 3 })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiProperty({ description: 'Current version for optimistic locking' })
  @IsInt()
  version!: number;
}
