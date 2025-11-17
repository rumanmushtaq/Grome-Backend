import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { AdminServicesService } from './admin-services.service';
import { AdminCreateServiceDto, AdminUpdateServiceDto } from '../../dto/services/admin-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';
import { ThrottlerGuard } from '@nestjs/throttler';
import { PaginationDto } from '@/dto/common/pagination.dto';

@ApiTags('admin-services')
@Controller('admin/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(ThrottlerGuard)
export class AdminServicesController {
  constructor(private readonly adminServicesService: AdminServicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new service (Admin only)' })
  @ApiResponse({ status: 201, description: 'Service successfully created' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async createService(@Body() createServiceDto: AdminCreateServiceDto) {
    return this.adminServicesService.createService(createServiceDto);
  }

@Get()
@ApiOperation({ summary: 'Get all services (Admin only, with pagination)' })
@ApiResponse({ status: 200, description: 'Services retrieved successfully' })
@ApiResponse({ status: 400, description: 'Invalid query parameters' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
async getAllServices(@Query() query: PaginationDto) {
  return this.adminServicesService.getAllServices(query);
}

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getServiceById(@Param('id') id: string) {
    return this.adminServicesService.getServiceById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service (Admin only)' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service successfully updated' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async updateService(@Param('id') id: string, @Body() updateServiceDto: AdminUpdateServiceDto) {
    return this.adminServicesService.updateService(id, updateServiceDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete service (Admin only)' })
  @ApiParam({ name: 'id', description: 'Service ID' })
  @ApiResponse({ status: 204, description: 'Service successfully deleted' })
  @ApiResponse({ status: 404, description: 'Service not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async deleteService(@Param('id') id: string) {
    return this.adminServicesService.deleteService(id);
  }

@Put(':id/status')
@ApiOperation({ summary: 'Update service status (Admin only)' })
@ApiParam({ name: 'id', description: 'Service ID' })
@ApiResponse({ status: 200, description: 'Service status updated' })
@ApiResponse({ status: 404, description: 'Service not found' })
@ApiResponse({ status: 400, description: 'Invalid data' })
@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
async updateServiceStatus(
  @Param('id') id: string,
  @Body('isActive') isActive: boolean
) {
  return this.adminServicesService.updateServiceStatus(id, isActive);
}
}
