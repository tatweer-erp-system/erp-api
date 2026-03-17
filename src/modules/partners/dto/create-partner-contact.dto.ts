import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsUUID,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class CreatePartnerContactDto {
  @ApiProperty({ description: 'Partner ID this contact belongs to', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  partnerId!: string;

  @ApiProperty({ description: 'Contact first name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @ApiPropertyOptional({ description: 'Contact last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Mobile number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Job position / title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({ description: 'Whether this is the main contact', default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
