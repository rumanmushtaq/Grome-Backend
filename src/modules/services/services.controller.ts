import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam ,  ApiQuery,} from "@nestjs/swagger";

import { ServicesService } from "./services.service";
import { PaginationDto } from "@/dto/common/pagination.dto";

@ApiTags("services")
@Controller("services")
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  @ApiOperation({ summary: "Get all services (with pagination)" })
  @ApiResponse({ status: 200, description: "Services retrieved successfully" })
  @ApiResponse({ status: 400, description: "Invalid query parameters" })
    @ApiQuery({ name: "page", required: false, type: Number })
    @ApiQuery({ name: "limit", required: false, type: Number })
    @ApiQuery({ name: "sortBy", required: false, type: String })
    @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
    @ApiQuery({ name: "active", required: false, type: Boolean })
  async findAll(@Query() query: PaginationDto, @Query("active") active?: boolean) {
    return this.servicesService.findAll(query, active);
  }

  @Get("available")
  @ApiOperation({ summary: "Get all available services for barber selection" })
  @ApiResponse({
    status: 200,
    description: "Available services retrieved successfully",
  })
  async getAvailableServices(@Query() query: PaginationDto) {
    return this.servicesService.findAll(query);
  }

  @Get("/categories")
  @ApiOperation({ summary: "Get all categories of services" })
  @ApiResponse({
    status: 200,
    description: "Categories of services retrieved successfully",
  })
  async categories() {
    console.log("Getting categories");
    return this.servicesService.getCategories();
  }

  
  @Get(":id")
  @ApiOperation({ summary: "Get service by ID" })
  @ApiParam({ name: "id", description: "Service ID" })
  @ApiResponse({ status: 200, description: "Service retrieved successfully" })
  async findById(@Param("id") id: string) {
    return this.servicesService.findById(id);
  }

}
