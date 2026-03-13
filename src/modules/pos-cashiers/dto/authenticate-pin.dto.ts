import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Matches } from 'class-validator';

export class AuthenticatePinDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: '1234', description: '4-6 digit PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin!: string;
}
