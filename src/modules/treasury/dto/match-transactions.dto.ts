import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class MatchTransactionsDto {
  @ApiProperty({
    type: [String],
    description: 'Array of treasury transaction IDs to mark as reconciled',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  transactionIds!: string[];
}
