import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class AssignPermissionDto {
  @ApiProperty({ description: 'Permission IDs to assign to the role', type: [String] })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
