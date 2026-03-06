import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { GetUserStatsQueryDto, TimeFilter, UserStatsResponseDto } from "./dto/user-stats.dto";

@ApiTags("dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  async getStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get("monthly-revenue")
  async getMonthlyRevenue() {
    return this.dashboardService.getMonthlyRevenue();
  }

  @Get("user-stats")
  @UseGuards(AuthGuard("jwt"))
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get user stats (appointments, earnings, time)",
    description: "Returns user's completed appointments, earnings, and total time spent with daily breakdown for chart visualization",
  })
  @ApiQuery({
    name: "timeFilter",
    enum: TimeFilter,
    required: false,
    description: "Time filter for stats (7d, 30d, 90d, this_month, last_month, this_year, all_time)",
  })
  @ApiResponse({
    status: 200,
    description: "User stats retrieved successfully",
    type: UserStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserStats(
    @CurrentUser() user: { userId: string; role: string },
    @Query() query: GetUserStatsQueryDto
  ): Promise<UserStatsResponseDto> {
    const timeFilter = query.timeFilter || TimeFilter.LAST_7_DAYS;
    const userRole = user.role === "barber" ? "barber" : "customer";
    return this.dashboardService.getUserStats(user.userId, timeFilter, userRole);
  }
}
