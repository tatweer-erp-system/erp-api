import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectBranchDto {
  @ApiProperty({
    description: 'Branch ID to select',
    example: '30000000-0000-4000-a000-000000000001',
  })
  @IsUUID()
  branchId!: string;
}
