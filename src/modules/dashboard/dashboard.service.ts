import { Booking, BookingDocument } from "@/schemas/booking.schema";
import { User, UserDocument } from "@/schemas/user.schema";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

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
}
