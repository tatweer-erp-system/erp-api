import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoseLeadDto {
  @ApiProperty({ description: 'Reason for losing the lead' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
