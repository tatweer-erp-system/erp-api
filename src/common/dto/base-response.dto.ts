import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from './pagination.dto';

export class BaseResponseDto<T> {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  meta?: PaginationMeta;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  lang?: string;
}

export class ErrorResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  error: {
    code: string;
    message: string;
    statusCode: number;
  };

  @ApiProperty()
  timestamp: string;
}
