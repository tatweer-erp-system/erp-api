import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, MinLength, IsOptional, Matches } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'acme-corp', description: 'Unique slug (lowercase, hyphens only)' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers and hyphens only' })
  slug!: string;

  @ApiProperty({ example: 'admin@acme.com' })
  @IsEmail()
  adminEmail!: string;

  @ApiProperty({ example: 'StrongPassword123!' })
  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  adminFirstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  adminLastName!: string;

  @ApiPropertyOptional({ example: 'starter' })
  @IsOptional()
  @IsString()
  plan?: string;
}
