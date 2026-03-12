import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(
  OmitType(CreateEmployeeDto, ['userId'] as const),
) {
  @ApiProperty({ description: 'Record version for optimistic locking', example: 1 })
  @IsNotEmpty()
  @IsInt()
  version!: number;
}
