import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ThreadService } from './thread.service';
import { CreateThreadDto } from './dto/thread.dto';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
// import { AdminJwt2FaAuthGuard } from 'src/admin-auth/strategy/admin-jwt-2fa.guard';
// import { Roles } from 'src/auth/decorators/roles.decorator';
// import { Role } from 'src/auth/enums/role.enum';
// import { ParseObjectIdPipe } from 'src/shared/pipes';
// import { ObjectId } from 'mongodb';
// import { RolesGuard } from 'src/auth/strategy/roles.guard';
// import { Jwt2FaAuthGuard } from 'src/auth/strategy/jwt-2fa.guard';
// import { KycGuard } from 'src/auth/strategy/kyc-guard.guard';
// import { ThreadParticipentGuard } from 'src/auth/strategy/thread-participent.guard';
// import { MaintenanceGuard } from 'src/auth/strategy/maintenance.guard';
// import { ThrottlerGuard } from '@nestjs/throttler';
// import { PaginationDto } from 'src/shared/DTOs/paginated-page-limit.dto';

@ApiTags('Chat Thread')
@Controller('thread')
@UseGuards(ThrottlerGuard)
// @UseGuards(MaintenanceGuard)
export class ThreadController {
  constructor(private threadService: ThreadService) {}

  // @ApiOperation({ summary: 'Get all threads of a user' })
  // @ApiBearerAuth()
  // @UseGuards(RolesGuard)
  // @UseGuards(KycGuard)
  // @UseGuards(Jwt2FaAuthGuard)
  // @Get('/')
  // async getAll(@Req() { user }) {
  //   return await this.threadService.getUserChatThreads(user);  // @ApiOperation({ summary: 'Get all threads of a user' })
  // @ApiBearerAuth()
  // @UseGuards(RolesGuard)
  // @UseGuards(KycGuard)
  // @UseGuards(Jwt2FaAuthGuard)
  // @Get('/')
  // async getAll(@Req() { user }) {
  //   return await this.threadService.getUserChatThreads(user);
  // }
  // }

  // @ApiOperation({ summary: 'Admin get all chat threads' })
  // @ApiQuery({ name: 'limit' })
  // @Roles(Role.ADMIN)
  // @ApiBearerAuth()
  // @UseGuards(AdminJwt2FaAuthGuard)
  // @Get('/admin')
  // async adminGetAll(@Query() query: PaginationDto) {
  //   return await this.threadService.adminGetAllThreads(query);
  // }

  // @ApiOperation({ summary: 'Delete chat thread' })
  // @ApiParam({ name: 'threadId' })
  // @UseGuards(ThreadParticipentGuard)
  // @ApiBearerAuth()
  // @UseGuards(RolesGuard)
  // @UseGuards(KycGuard)
  // @UseGuards(Jwt2FaAuthGuard)
  // @Delete('/:threadId')
  // async delete(
  //   @Param('threadId', ParseObjectIdPipe) threadId: ObjectId,
  //   @Req() { user },
  // ) {
  //   return await this.threadService.delete(threadId, user);
  // }

  @ApiOperation({ summary: 'Create a new chat thread' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('/')
  async create(@Body() payload: CreateThreadDto, @Req() { user }) {
    return await this.threadService.create(user, payload);
  }
}
