import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddReactionDto {
  @ApiProperty({ description: 'Emoji reaction', example: '\uD83D\uDC4D' })
  @IsString()
  emoji!: string;
}
