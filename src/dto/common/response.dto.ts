import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiProperty({ description: 'Error details', required: false })
  error?: any;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;
}

export class CursorPaginatedResponseDto<T> {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Response data' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata' })
  meta: {
    cursor?: string;
    nextCursor?: string;
    hasNextPage: boolean;
    limit: number;
  };

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;
}
