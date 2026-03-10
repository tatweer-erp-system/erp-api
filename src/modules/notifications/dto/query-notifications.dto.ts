import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter unread notifications only' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread?: boolean;

  @ApiPropertyOptional({ description: 'Filter by event type' })
  @IsOptional()
  @IsString()
  eventType?: string;
}
