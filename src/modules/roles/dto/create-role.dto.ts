import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsUUID,
  IsArray,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty() @IsString() @IsNotEmpty() nameEn: string;
  @ApiProperty() @IsString() @IsNotEmpty() nameAr: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
export class UpdateRoleDto extends PartialType(CreateRoleDto) {
  @ApiProperty() @IsInt() @Min(0) version: number;
}
export class AssignPermissionsDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}
