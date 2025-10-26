import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { ServicesService } from './services.service';
import { PaginationDto } from '@/dto/common/pagination.dto';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

@Get()
@ApiOperation({ summary: 'Get all services (with pagination)' })
@ApiResponse({ status: 200, description: 'Services retrieved successfully' })
@ApiResponse({ status: 400, description: 'Invalid query parameters' })
async findAll(@Query() query: PaginationDto) {
  return this.servicesService.findAll(query);
}

  @Get('available')
  @ApiOperation({ summary: 'Get all available services for barber selection' })
  @ApiResponse({ status: 200, description: 'Available services retrieved successfully' })
  async getAvailableServices(@Query() query: PaginationDto) {
    return this.servicesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  async findById(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }
}
