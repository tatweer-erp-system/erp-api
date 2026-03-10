import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  SUPPORT = 'support',
}

export class CreateAdminDto {
  @ApiProperty({ example: 'admin@platform.com', description: 'Admin email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Admin password', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'John', description: 'Admin first name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Admin last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({
    enum: AdminRole,
    example: AdminRole.ADMIN,
    description: 'Admin role',
  })
  @IsEnum(AdminRole)
  @IsNotEmpty()
  role: AdminRole;
}
