import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class ApproveOverrideDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Manager user ID' })
  @IsUUID()
  @IsNotEmpty()
  managerUserId!: string;

  @ApiProperty({ example: '1234', description: 'Manager 4-6 digit PIN' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  managerPin!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
