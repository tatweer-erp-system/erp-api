import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiProperty({ description: 'Record version for optimistic locking', example: 1 })
  @IsNotEmpty()
  @IsInt()
  version!: number;
}
