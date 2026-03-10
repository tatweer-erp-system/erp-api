import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class QueryMessagesDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Message ID for cursor-based pagination (fetch messages before this ID)',
  })
  @IsOptional()
  @IsString()
  before?: string;
}
