import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ToggleBranchStatusDto {
  @ApiProperty({ description: 'Whether the branch is active', example: true })
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}
