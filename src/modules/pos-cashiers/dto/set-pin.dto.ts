import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Matches } from 'class-validator';

export class SetPinDto {
  @ApiProperty({ example: '5678', description: 'New 4-6 digit PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string;

  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @IsNotEmpty()
  version!: number;
}
