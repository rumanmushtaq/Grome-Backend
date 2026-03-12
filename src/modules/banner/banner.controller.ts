import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { BannerService } from "./banner.service";
import {
  CreateBannerDto,
  UpdateBannerDto,
  UpdateStatusDto,
} from "./dtos/banner.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { Public } from "@/common/decorators/public.decorator";
import { UserRole } from "@/schemas/user.schema";

@ApiTags("banners")
@Controller("banners")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  // 🔐 Admin - Create Banner
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.bannerService.create(dto);
  }

  // 🔐 Admin - Get All
  @Get()
  @Public()
  findAll() {
    return this.bannerService.findAll();
  }

  // 🌍 Website - Get Active Banners (public - no auth required)
  @Public()
  @Get("active")
  findActive() {
    return this.bannerService.findActive();
  }

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.bannerService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateBannerDto) {
    return this.bannerService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Put(":id/status")
  async updateStatus(@Param("id") id: string, @Body() dto: UpdateStatusDto) {
    return this.bannerService.updateStatus(id, dto.isActive);
  }

  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.bannerService.remove(id);
  }
}
