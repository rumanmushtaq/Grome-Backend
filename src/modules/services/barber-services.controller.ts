import { Controller, Get, Put, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { BarberServicesService } from './barber-services.service';
import { BarberServiceUpdateDto, BarberServiceResponseDto } from '../../dto/services/barber-service.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../schemas/user.schema';

@ApiTags('barber-services')
@Controller('barber/services')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.BARBER)
export class BarberServicesController {
  constructor(private readonly barberServicesService: BarberServicesService) {}

  @Get()
  @ApiOperation({ summary: 'Get barber services' })
  @ApiResponse({ status: 200, description: 'Barber services retrieved successfully', type: [BarberServiceResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Barber access required' })
  async getBarberServices(@Request() req) {
    return this.barberServicesService.getBarberServices(req.user.userId);
  }

  @Post('add')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add service to barber profile' })
  @ApiResponse({ status: 201, description: 'Service successfully added to barber profile' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Barber access required' })
  async addServiceToBarber(@Request() req, @Body() addServiceDto: { serviceId: string; price: number }) {
    return this.barberServicesService.addServiceToBarber(req.user.userId, addServiceDto.serviceId, addServiceDto.price);
  }

  @Put('update')
  @ApiOperation({ summary: 'Update barber service' })
  @ApiResponse({ status: 200, description: 'Barber service successfully updated' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Service not found in barber profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Barber access required' })
  async updateBarberService(@Request() req, @Body() updateServiceDto: BarberServiceUpdateDto) {
    return this.barberServicesService.updateBarberService(req.user.userId, updateServiceDto);
  }

  @Put('remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove service from barber profile' })
  @ApiResponse({ status: 204, description: 'Service successfully removed from barber profile' })
  @ApiResponse({ status: 404, description: 'Service not found in barber profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Barber access required' })
  async removeServiceFromBarber(@Request() req, @Body() body: { serviceId: string }) {
    return this.barberServicesService.removeServiceFromBarber(req.user.userId, body.serviceId);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available services for barber to add' })
  @ApiResponse({ status: 200, description: 'Available services retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Barber access required' })
  async getAvailableServices(@Request() req) {
    return this.barberServicesService.getAvailableServicesForBarber(req.user.userId);
  }
}
