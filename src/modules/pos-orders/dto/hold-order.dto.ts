import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class HoldOrderDto {
  @ApiProperty({ description: 'Tab label for the held order', example: 'Table 5' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tabLabel!: string;
}
