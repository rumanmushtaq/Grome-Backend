import { Booking, BookingDocument, BookingStatus } from "@/schemas/booking.schema";
import { User, UserDocument } from "@/schemas/user.schema";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { TimeFilter, UserStatsResponseDto, DailyStatsDto } from "./dto/user-stats.dto";

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>
  ) {}

  async getDashboardStats() {
    try {
      // Total barbers
      const totalBarbers = await this.userModel.countDocuments({
        role: "barber",
      });

      // Total customers
      const totalCustomers = await this.userModel.countDocuments({
        role: "customer",
      });

      // Total appointments
      const totalAppointments = await this.bookingModel.countDocuments();

      // Month revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthAppointments = await this.bookingModel.find({
        createdAt: { $gte: startOfMonth },
        status: "completed",
      });

      // Sum up all services in all appointments
      const monthRevenue = monthAppointments.reduce((sum, appointment) => {
        const servicesTotal =
          appointment.services?.reduce(
            (serviceSum, service) => serviceSum + (service.price || 0),
            0
          ) || 0;
        return sum + servicesTotal;
      }, 0);

      // Cancellation rate
      const cancelledAppointments = await this.bookingModel.countDocuments({
        status: "cancelled",
      });

      const cancellationRate = totalAppointments
        ? cancelledAppointments / totalAppointments
        : 0;

      // Average rating
      const ratings = await this.bookingModel.aggregate([
        { $match: { rating: { $exists: true } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]);

      const avgRating = ratings[0]?.avgRating || 0;

      return {
        totalBarbers,
        totalCustomers,
        totalAppointments,
        monthRevenue,
        cancellationRate: Number(cancellationRate.toFixed(2)), // formatted
        avgRating: Number(avgRating.toFixed(2)),
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw new InternalServerErrorException(
        "Failed to fetch dashboard statistics"
      );
    }
  }

  async getMonthlyRevenue() {
    try {
      const currentYear = new Date().getFullYear();

      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear + 1, 0, 1);

      // Fetch bookings
      const bookings = await this.bookingModel.find({
        createdAt: { $gte: startOfYear, $lt: endOfYear },
        status: "completed", // only completed bookings generate revenue
      });

      // Month template
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const result = months.map((month) => ({
        month,
        revenue: 0,
        bookings: 0,
        commission: 0,
        payout: 0,
      }));

      // Populate monthly stats
      for (const booking of bookings) {
        const bookingData = booking as any;
        if (!bookingData?.createdAt) continue;

        const monthIndex = bookingData.createdAt.getMonth();
        if (monthIndex < 0 || monthIndex > 11) continue;

        const amount = booking?.payment?.amount ?? 0;
        const commission = booking?.payment?.commission ?? 0;
        const payout = booking?.payment?.payoutAmount ?? 0;

        result[monthIndex].bookings += 1;
        result[monthIndex].revenue += amount;
        result[monthIndex].commission += commission;
        result[monthIndex].payout += payout;
      }

      return {
        success: true,
        year: currentYear,
        data: result,
      };
    } catch (error) {
      console.error("❌ Error in getMonthlyRevenue:", error);

      return {
        success: false,
        message: "Failed to calculate monthly revenue",
        error: error instanceof Error ? error.message : error,
        data: [],
      };
    }
  }

  /**
   * Get user stats including appointments, earnings, and time spent
   * with time-based filtering (7d, 30d, 90d, etc.)
   */
  async getUserStats(
    userId: string,
    timeFilter: TimeFilter,
    userRole: "customer" | "barber"
  ): Promise<UserStatsResponseDto> {
    try {
      const { startDate, endDate } = this.getDateRange(timeFilter);

      // Build query based on user role
      const query: any = {
        status: BookingStatus.COMPLETED,
        completedAt: { $gte: startDate, $lte: endDate },
      };

      if (userRole === "customer") {
        query.customerId = new Types.ObjectId(userId);
      } else {
        query.barberId = new Types.ObjectId(userId);
      }

      // Fetch completed bookings within the date range
      const bookings = await this.bookingModel.find(query).lean();

      // Calculate totals
      let totalAppointments = 0;
      let totalEarnings = 0;
      let totalTimeMinutes = 0;

      // Initialize daily stats map
      const dailyStatsMap = new Map<string, DailyStatsDto>();

      // Generate all dates in the range for the chart
      const days = this.generateDateRange(startDate, endDate);
      for (const day of days) {
        dailyStatsMap.set(day.date, {
          date: day.date,
          day: day.day,
          appointments: 0,
          earnings: 0,
          totalTimeMinutes: 0,
        });
      }

      // Process bookings
      for (const booking of bookings) {
        totalAppointments++;

        // Calculate earnings (payout amount for barber, or total amount for customer view)
        const earnings =
          userRole === "barber"
            ? booking.payment?.payoutAmount || 0
            : booking.payment?.amount || 0;
        totalEarnings += earnings;

        // Calculate total time from services
        const bookingTimeMinutes =
          booking.services?.reduce(
            (sum, service) => sum + (service.duration || 0),
            0
          ) || 0;
        totalTimeMinutes += bookingTimeMinutes;

        // Group by date for daily stats
        if (booking.completedAt) {
          const dateKey = this.formatDateKey(booking.completedAt);
          const dayStats = dailyStatsMap.get(dateKey);
          if (dayStats) {
            dayStats.appointments += 1;
            dayStats.earnings += earnings;
            dayStats.totalTimeMinutes += bookingTimeMinutes;
          }
        }
      }

      // Convert map to array and sort by date
      const dailyStats = Array.from(dailyStatsMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return {
        totalAppointments,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        totalTimeHours: Number((totalTimeMinutes / 60).toFixed(1)),
        currency: "USD",
        dailyStats,
        startDate,
        endDate,
        timeFilter,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      throw new InternalServerErrorException("Failed to fetch user statistics");
    }
  }

  /**
   * Get date range based on time filter
   */
  private getDateRange(timeFilter: TimeFilter): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);

    switch (timeFilter) {
      case TimeFilter.LAST_7_DAYS:
        startDate.setDate(now.getDate() - 6);
        break;
      case TimeFilter.LAST_30_DAYS:
        startDate.setDate(now.getDate() - 29);
        break;
      case TimeFilter.LAST_90_DAYS:
        startDate.setDate(now.getDate() - 89);
        break;
      case TimeFilter.THIS_MONTH:
        startDate.setDate(1);
        break;
      case TimeFilter.LAST_MONTH:
        startDate.setMonth(now.getMonth() - 1);
        startDate.setDate(1);
        endDate.setMonth(now.getMonth());
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case TimeFilter.THIS_YEAR:
        startDate.setMonth(0, 1);
        break;
      case TimeFilter.ALL_TIME:
        startDate.setFullYear(2000, 0, 1);
        break;
      default:
        startDate.setDate(now.getDate() - 6);
    }

    return { startDate, endDate };
  }

  /**
   * Generate array of dates for the chart
   */
  private generateDateRange(startDate: Date, endDate: Date): Array<{ date: string; day: string }> {
    const days = [];
    const current = new Date(startDate);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    while (current <= endDate) {
      days.push({
        date: this.formatDateKey(current),
        day: dayNames[current.getDay()],
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
