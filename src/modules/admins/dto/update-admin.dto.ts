import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminRole } from './create-admin.dto';

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'admin@platform.com', description: 'Admin email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'John', description: 'Admin first name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Admin last name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({
    enum: AdminRole,
    example: AdminRole.ADMIN,
    description: 'Admin role',
  })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
