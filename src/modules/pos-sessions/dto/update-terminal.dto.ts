import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { CreateTerminalDto } from './create-terminal.dto';

export class UpdateTerminalDto extends PartialType(CreateTerminalDto) {
  @ApiProperty({ description: 'Optimistic locking version' })
  @IsInt()
  @IsNotEmpty()
  version!: number;
}
