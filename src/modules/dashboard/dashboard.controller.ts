import { Controller, Get } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { ApiTags } from "@nestjs/swagger";

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
}
