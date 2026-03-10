import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password (min 8 characters)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
