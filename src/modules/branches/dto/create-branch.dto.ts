import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty() @IsString() @IsNotEmpty() nameEn: string;
  @ApiProperty() @IsString() @IsNotEmpty() nameAr: string;
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiPropertyOptional() @IsString() @IsOptional() address?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
}
export class UpdateBranchDto extends PartialType(CreateBranchDto) {
  @ApiProperty() @IsInt() @Min(0) version: number;
}
export class FilterBranchDto {
  @ApiPropertyOptional() @IsOptional() search?: string;
  @ApiPropertyOptional() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() page?: number;
  @ApiPropertyOptional() @IsOptional() limit?: number;
}
