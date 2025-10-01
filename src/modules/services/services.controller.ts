import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { ServicesService } from './services.service';

@ApiTags('services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all services' })
  @ApiResponse({ status: 200, description: 'Services retrieved successfully' })
  async findAll() {
    return this.servicesService.findAll();
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available services for barber selection' })
  @ApiResponse({ status: 200, description: 'Available services retrieved successfully' })
  async getAvailableServices() {
    return this.servicesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  async findById(@Param('id') id: string) {
    return this.servicesService.findById(id);
  }
}
