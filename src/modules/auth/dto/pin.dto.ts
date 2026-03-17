import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class PinDto {
  @ApiProperty({ description: 'A 4-6 digit PIN', example: '1234' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4-6 digits' })
  pin: string;
}
