import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  UseGuards,
  Query,
  Put,
} from "@nestjs/common";
import { CategoryService } from "./category.service";
import {
  CategoryQueryDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  UpdateCategoryStatusDto,
} from "./dto/category.dto";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Roles } from "@/common/decorators/roles.decorator";
import { UserRole } from "@/schemas/user.schema";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Public } from "@/common/decorators/public.decorator";
import { PaginationDto } from "@/dto/common/pagination.dto";

@ApiTags("categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return await this.categoryService.create(dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Get all categories (with pagination)" })
  @ApiResponse({
    status: 200,
    description: "Categories retrieved successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid query parameters" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "sortBy", required: false, type: String })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query() query: CategoryQueryDto
  ) {
    return await this.categoryService.findAll(pagination, query);
  }

  @Public()
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return await this.categoryService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return await this.categoryService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    return await this.categoryService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Put(":id/status")
  @ApiOperation({ summary: "Update category status (Admin only)" })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({ status: 200, description: "Category status updated" })
  @ApiResponse({ status: 404, description: "Category not found" })
  @ApiResponse({ status: 400, description: "Invalid data" })
  @ApiResponse({ status: 403, description: "Forbidden - Admin only" })
  async updateCategoryStatus(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryStatusDto
  ) {
    return this.categoryService.updateCategoryStatus(id, dto.isActive);
  }
}
