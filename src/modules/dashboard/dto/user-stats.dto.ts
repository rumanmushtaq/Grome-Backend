import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

export enum TimeFilter {
  LAST_7_DAYS = "7d",
  LAST_30_DAYS = "30d",
  LAST_90_DAYS = "90d",
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_YEAR = "this_year",
  ALL_TIME = "all_time",
}

export class GetUserStatsQueryDto {
  @ApiProperty({
    enum: TimeFilter,
    description: "Time filter for stats",
    example: TimeFilter.LAST_7_DAYS,
    default: TimeFilter.LAST_7_DAYS,
  })
  @IsEnum(TimeFilter)
  @IsOptional()
  timeFilter?: TimeFilter = TimeFilter.LAST_7_DAYS;
}

export class DailyStatsDto {
  @ApiProperty({ description: "Date of the stats" })
  date: string;

  @ApiProperty({ description: "Day name (Mon, Tue, etc.)" })
  day: string;

  @ApiProperty({ description: "Number of appointments" })
  appointments: number;

  @ApiProperty({ description: "Earnings for the day" })
  earnings: number;

  @ApiProperty({ description: "Total time spent in minutes" })
  totalTimeMinutes: number;
}

export class UserStatsResponseDto {
  @ApiProperty({ description: "Total completed appointments" })
  totalAppointments: number;

  @ApiProperty({ description: "Total earnings" })
  totalEarnings: number;

  @ApiProperty({ description: "Total time spent in hours" })
  totalTimeHours: number;

  @ApiProperty({ description: "Currency code", example: "USD" })
  currency: string;

  @ApiProperty({
    description: "Daily breakdown of stats",
    type: [DailyStatsDto],
  })
  dailyStats: DailyStatsDto[];

  @ApiProperty({ description: "Start date of the filter range" })
  startDate: Date;

  @ApiProperty({ description: "End date of the filter range" })
  endDate: Date;

  @ApiProperty({ enum: TimeFilter, description: "Applied time filter" })
  timeFilter: TimeFilter;
}
