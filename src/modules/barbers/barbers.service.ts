import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import { Barber, BarberDocument } from "../../schemas/barber.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import {
  CreateBarberDto,
  UpdateBarberDto,
  SearchBarbersDto,
  BarberResponseDto,
  BarberWithUserDetailResponseDto,
} from "../../dto/barbers/barber.dto";
import { InvalidId, NotFound } from "@/constants/messages.constants";

@Injectable()
export class BarbersService {
  constructor(
    @InjectModel(Barber.name) private barberModel: Model<BarberDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createBarber(
    userId: string,
    createBarberDto: CreateBarberDto,
  ): Promise<BarberResponseDto> {
    // Check if user exists and is a barber
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role !== "barber") {
      throw new ForbiddenException(
        "User must be a barber to create barber profile",
      );
    }

    // Check if barber profile already exists
    const existingBarber = await this.barberModel.findOne({ userId });
    if (existingBarber) {
      throw new ForbiddenException("Barber profile already exists");
    }

    const barber = new this.barberModel({
      userId,
      ...createBarberDto,
    });

    await barber.save();
    return this.mapToResponseDto(barber);
  }

  async updateBarber(
    userId: string,
    updateBarberDto: UpdateBarberDto,
  ): Promise<BarberResponseDto> {
    const barber = await this.barberModel
      .findOneAndUpdate({ userId }, { $set: updateBarberDto }, { new: true })
      .exec();

    if (!barber) {
      throw new NotFoundException("Barber profile not found");
    }

    return this.mapToResponseDto(barber);
  }

  async getBarberById(barberId: string): Promise<BarberResponseDto> {
    // 1️⃣ Validate ObjectId early
    if (!Types.ObjectId.isValid(barberId)) {
      throw new BadRequestException(InvalidId("barber"));
    }
    const [barber] = await this.barberModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(barberId),
        },
      },

      /* ==========================
         JOIN USER (SAFE VERSION)
      ========================== */
      {
        $lookup: {
          from: "users",
          let: { barberUserId: "$userId" },
          pipeline: [
            {
              $addFields: {
                _idStr: {
                  $cond: [
                    { $eq: [{ $type: "$_id" }, "objectId"] },
                    { $toString: "$_id" },
                    "$_id",
                  ],
                },
              },
            },
            {
              $match: {
                $expr: {
                  $eq: ["$_idStr", { $toString: "$$barberUserId" }],
                },
              },
            },
            {
              $project: {
                password: 0,
                __v: 0,
              },
            },
          ],
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true,
        },
      },

      /* ==========================
         EXTRACT serviceIds
      ========================== */
      {
        $addFields: {
          serviceIds: {
            $map: {
              input: "$services",
              as: "s",
              in: "$$s.serviceId",
            },
          },
        },
      },

      /* ==========================
         JOIN SERVICES
      ========================== */
      {
        $lookup: {
          from: "services",
          let: { serviceIds: "$serviceIds" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$serviceIds"],
                },
              },
            },
            {
              $match: {
                isActive: true,
                isDeleted: { $ne: true },
              },
            },

            /* ==========================
               JOIN CATEGORIES
            ========================== */
            {
              $lookup: {
                from: "categories",
                localField: "categoryIds",
                foreignField: "_id",
                as: "categories",
              },
            },

            {
              $project: {
                __v: 0,
                "categories.__v": 0,
              },
            },
          ],
          as: "services",
        },
      },

      /* ==========================
         CLEAN SENSITIVE FIELDS
      ========================== */
      {
        $project: {
          password: 0,
          __v: 0,
          serviceIds: 0,
        },
      },
    ]);

    if (!barber) {
      throw new NotFoundException(NotFound("Barber"));
    }

    return barber;
  }

  async getBarberByUserId(userId: string): Promise<BarberResponseDto> {
    // 1️⃣ Validate ObjectId early
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(InvalidId("user"));
    }

    const barber = await this.barberModel.findOne({ userId }).exec();
    if (!barber) {
      throw new NotFoundException("Barber profile not found");
    }

    if (!barber) {
      throw new NotFoundException(NotFound("Barber"));
    }

    return this.mapToResponseDto(barber);
  }

  async searchBarbers(searchDto: SearchBarbersDto): Promise<{
    barbers: BarberWithUserDetailResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      latitude,
      longitude,
      radius = 10,
      serviceId,
      minRating = 0,
      sortBy = "distance",
      sortOrder = "asc",
      page = 1,
      limit = 10,
    } = searchDto;

    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          distanceField: "distance",
          maxDistance: radius * 1000, // Convert km to meters
          spherical: true,
        },
      },
      {
        $match: {
          isActive: true,
          rating: { $gte: minRating },
          ...(serviceId && {
            "services.serviceId": serviceId,
          }),
        },
      },

      // 1️⃣ Lookup user details
      {
        $lookup: {
          from: "users", // collection name
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: true, // allow barber without user
        },
      },

      // 2️⃣ Lookup service details if your services collection exists
      {
        $lookup: {
          from: "services",
          let: { serviceIds: "$services.serviceId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$serviceIds"],
                },
              },
            },
            {
              $project: {
                name: 1,
                duration: 1,
                price: 1,
                description: 1,
              },
            },
          ],
          as: "serviceDetails",
        },
      },

      // 2️⃣ Remove sensitive fields
      {
        $project: {
          "user.password": 0,
          "user.preferences": 0,
          "user.phoneVerificationExpires": 0,
          "user.phoneVerificationId": 0,
          "user.socialAuth": 0,
          "user.verification": 0,
          "user.passwordHash": 0,
          "user.__v": 0,
        },
      },
    ];

    // Add sorting
    const sortField = sortBy === "distance" ? "distance" : sortBy;
    pipeline.push({
      $sort: { [sortField]: sortOrder === "asc" ? 1 : -1 },
    });

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const [barbers, totalCount] = await Promise.all([
      this.barberModel.aggregate(pipeline).exec(),
      this.barberModel
        .aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [longitude, latitude],
              },
              distanceField: "distance",
              maxDistance: radius * 1000,
              spherical: true,
            },
          },
          {
            $match: {
              isActive: true,
              rating: { $gte: minRating },
              ...(serviceId && {
                "services.serviceId": serviceId,
              }),
            },
          },
          { $count: "total" },
        ])
        .exec(),
    ]);

    const total = totalCount[0]?.total || 0;

    return {
      barbers: barbers.map((barber) =>
        this.mapToBarberUserDetailResponseDto(barber),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // async getNearbyBarbers(
  //   latitude: number,
  //   longitude: number,
  //   radius: number = 10,
  //   type: "light" | "full" = "light",
  // ): Promise<any[]> {
  //   const pipeline: any[] = [
  //     {
  //       $geoNear: {
  //         near: { type: "Point", coordinates: [longitude, latitude] },
  //         distanceField: "distance",
  //         maxDistance: radius * 1000,
  //         spherical: true,
  //       },
  //     },
  //     {
  //       $match: {
  //         isActive: true,
  //         isOnline: true,
  //       },
  //     },

  //     // 🔥 SAFE userId conversion
  //     {
  //       $addFields: {
  //         userId: {
  //           $cond: [
  //             { $eq: [{ $type: "$userId" }, "objectId"] },
  //             "$userId",
  //             {
  //               $cond: [
  //                 { $eq: [{ $type: "$userId" }, "string"] },
  //                 { $toObjectId: "$userId" },
  //                 null,
  //               ],
  //             },
  //           ],
  //         },
  //       },
  //     },

  //     // 🔹 JOIN USER
  //     {
  //       $lookup: {
  //         from: "users", // ⚠️ verify this name
  //         localField: "userId",
  //         foreignField: "_id",
  //         as: "user",
  //       },
  //     },

  //     {
  //       $unwind: {
  //         path: "$user",
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },

  //     { $sort: { distance: 1 } },
  //     { $limit: 20 },
  //   ];

  //   // LIGHT RESPONSE
  //   if (type === "light") {
  //     pipeline.push({
  //       $project: {
  //         _id: 1,
  //         userId: 1,
  //         distance: 1,
  //         rating: 1,
  //         reviewsCount: 1,
  //         user: {
  //           _id: "$user._id",
  //           name: "$user.name",
  //           email: "$user.email",
  //           phone: "$user.phone",
  //           avatar: "$user.avatar",
  //           isVerified: "$user.isVerified",
  //         },
  //         experienceYears: 1,
  //         services: 1,
  //         images: { $slice: ["$images", 1] }, // only 1 image
  //       },
  //     });
  //   }

  //   // FULL RESPONSE
  //   if (type === "full") {
  //     pipeline.push({
  //       $project: {
  //         _id: 1,
  //         userId: 1,
  //         distance: 1,
  //         rating: 1,

  //         reviewsCount: 1,
  //         experienceYears: 1,
  //         services: 1,
  //         images: 1,
  //         availability: 1,
  //         description: 1,
  //         specialties: 1,
  //         commissionRate: 1,
  //         serviceRadius: 1,
  //         location: 1,
  //         createdAt: 1,
  //         updatedAt: 1,
  //         user: {
  //           _id: "$user._id",
  //           name: "$user.name",
  //           email: "$user.email",
  //           phone: "$user.phone",
  //           avatar: "$user.avatar",
  //           isVerified: "$user.isVerified",
  //         },
  //       },
  //     });
  //   }

  //   const barbers = await this.barberModel.aggregate(pipeline).exec();
  //   return barbers.map((b) => this.mapToResponseDto(b));
  // }

  async getNearbyBarbers(
    latitude: number,
    longitude: number,
    radius = 10,
    type: "light" | "full" = "light",
  ): Promise<any[]> {
    const pipeline: any[] = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "distance",
          maxDistance: radius * 1000,
          spherical: true,
        },
      },
      {
        $match: {
          isActive: true,
          isOnline: true,
        },
      },

      // ✅ USER LOOKUP (FIXED)
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },

      // ✅ SERVICE LOOKUP (FIXED)
      {
        $lookup: {
          from: "services",
          let: {
            serviceIds: {
              $map: {
                input: {
                  $ifNull: ["$services", []], // 🛡️ critical fix
                },
                as: "s",
                in: {
                  $cond: [
                    { $eq: [{ $type: "$$s.serviceId" }, "objectId"] },
                    "$$s.serviceId",
                    {
                      $cond: [
                        { $eq: [{ $type: "$$s.serviceId" }, "string"] },
                        { $toObjectId: "$$s.serviceId" },
                        null,
                      ],
                    },
                  ],
                },
              },
            },
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$serviceIds"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: 1,
                duration: 1,
                price: 1,
              },
            },
          ],
          as: "serviceDetails",
        },
      },

      // 🔒 SECURITY
      {
        $project: {
          "user.password": 0,
          "user.passwordHash": 0,
          "user.refreshToken": 0,
          "user.__v": 0,
        },
      },

      { $sort: { distance: 1 } },
      { $limit: 20 },
    ];

    // LIGHT
    if (type === "light") {
      pipeline.push({
        $project: {
          distance: 1,
          rating: 1,
          reviewsCount: 1,
          experienceYears: 1,
          images: { $slice: ["$images", 1] },
          user: 1,
          serviceDetails: 1,
        },
      });
    }

    // FULL
    if (type === "full") {
      pipeline.push({
        $project: {
          distance: 1,
          rating: 1,
          reviewsCount: 1,
          experienceYears: 1,
          images: 1,
          availability: 1,
          description: 1,
          specialties: 1,
          commissionRate: 1,
          serviceRadius: 1,
          location: 1,
          user: 1,
          serviceDetails: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      });
    }

    const barbers = await this.barberModel.aggregate(pipeline);
    return barbers.map((b) => this.mapToBarberUserDetailResponseDto(b));
  }

  async updateBarberStatus(
    userId: string,
    isOnline: boolean,
  ): Promise<BarberResponseDto> {
    const barber = await this.barberModel
      .findOneAndUpdate(
        { userId },
        {
          isOnline,
          lastSeenAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!barber) {
      throw new NotFoundException("Barber profile not found");
    }

    return this.mapToResponseDto(barber);
  }

  async updateBarberRating(
    barberId: string,
    newRating: number,
  ): Promise<BarberResponseDto> {
    const barber = await this.barberModel.findById(barberId);
    if (!barber) {
      throw new NotFoundException("Barber not found");
    }

    // Calculate new average rating
    const totalRating = barber.rating * barber.reviewsCount + newRating;
    const newReviewsCount = barber.reviewsCount + 1;
    const averageRating = totalRating / newReviewsCount;

    barber.rating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
    barber.reviewsCount = newReviewsCount;

    await barber.save();
    return this.mapToResponseDto(barber);
  }

  // async getAllBarbers(
  //   page: number = 1,
  //   limit: number = 10,
  // ): Promise<{
  //   barbers: BarberResponseDto[];
  //   total: number;
  //   page: number;
  //   limit: number;
  //   totalPages: number;
  // }> {
  //   const skip = (page - 1) * limit;

  //   const [barbers, total] = await Promise.all([
  //     this.barberModel.find({ isActive: true }).skip(skip).limit(limit).exec(),
  //     this.barberModel.countDocuments({ isActive: true }).exec(),
  //   ]);

  //   return {
  //     barbers: barbers.map((barber) => this.mapToResponseDto(barber)),
  //     total,
  //     page,
  //     limit,
  //     totalPages: Math.ceil(total / limit),
  //   };
  // }

  async getAllBarbers(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    barbers: BarberWithUserDetailResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    // Aggregation pipeline
    const pipeline: any[] = [
      { $match: { isActive: true } },

      // 1️⃣ Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // 2️⃣ Lookup service details if your services collection exists
      {
        $lookup: {
          from: "services", // MongoDB collection name for services
          localField: "services.serviceId", // array of ObjectIds in barber
          foreignField: "_id",
          as: "serviceDetails",
        },
      },

      // 3️⃣ Remove sensitive fields
      {
        $project: {
          "user.password": 0,
          "user.preferences": 0,
          "user.phoneVerificationExpires": 0,
          "user.phoneVerificationId": 0,
          "user.socialAuth": 0,
          "user.verification": 0,
          "user.passwordHash": 0,
          "user.__v": 0,
        },
      },

      // 4️⃣ Sort by creation date descending (optional)
      { $sort: { createdAt: -1 } },

      // 5️⃣ Pagination
      { $skip: skip },
      { $limit: limit },
    ];

    // Execute aggregation and total count in parallel
    const [barbers, totalCount] = await Promise.all([
      this.barberModel.aggregate(pipeline).exec(),
      this.barberModel.countDocuments({ isActive: true }),
    ]);

    return {
      barbers: barbers.map((barber) =>
        this.mapToBarberUserDetailResponseDto({
          ...barber,
          services: barber.serviceDetails, // map services properly
        }),
      ),
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  private mapToResponseDto(barber: BarberDocument | any): BarberResponseDto {
    return {
      id: barber._id.toString(),
      userId: barber.userId.toString(),
      location: barber.location,
      services: barber.services,
      rating: barber.rating,
      reviewsCount: barber.reviewsCount,
      availability: barber.availability,
      experienceYears: barber.experienceYears,
      images: barber.images,
      description: barber.description,
      bio: barber.bio,
      specialties: barber.specialties,
      isActive: barber.isActive,
      isOnline: barber.isOnline,
      lastSeenAt: barber.lastSeenAt,
      commissionRate: barber.commissionRate,
      serviceRadius: barber.serviceRadius,
      createdAt: barber.createdAt,
      updatedAt: barber.updatedAt,
      distance: barber.distance, // This will be present in geo queries
    };
  }

  private mapToBarberUserDetailResponseDto(
    barber: any,
  ): BarberWithUserDetailResponseDto {
    return {
      id: barber._id.toString(),
      user: barber.user,
      location: barber.location,
      services: barber.services,
      rating: barber.rating,
      reviewsCount: barber.reviewsCount,
      availability: barber.availability,
      experienceYears: barber.experienceYears,
      images: barber.images,
      description: barber.description,
      bio: barber.bio,
      specialties: barber.specialties,
      isActive: barber.isActive,
      isOnline: barber.isOnline,
      lastSeenAt: barber.lastSeenAt,
      commissionRate: barber.commissionRate,
      serviceRadius: barber.serviceRadius,
      createdAt: barber.createdAt,
      updatedAt: barber.updatedAt,
      distance: barber.distance, // This will be present in geo queries
    };
  }

  async getBarbersByService(serviceId: string) {
    const pipeline: any[] = [
      {
        $match: {
          isActive: true,
          "services.serviceId": new Types.ObjectId(serviceId),
        },
      },

      // 1️⃣ Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // 2️⃣ Lookup service details if your services collection exists
      {
        $lookup: {
          from: "services", // MongoDB collection name for services
          localField: "services.serviceId", // array of ObjectIds in barber
          foreignField: "_id",
          as: "serviceDetails",
        },
      },

      // 3️⃣ Remove sensitive fields
      {
        $project: {
          "user.password": 0,
          "user.preferences": 0,
          "user.phoneVerificationExpires": 0,
          "user.phoneVerificationId": 0,
          "user.socialAuth": 0,
          "user.verification": 0,
          "user.passwordHash": 0,
          "user.__v": 0,
        },
      },

      // 4️⃣ Sort by creation date descending (optional)
      { $sort: { createdAt: -1 } },
    ];

    const [barbers, totalCount] = await Promise.all([
      this.barberModel.aggregate(pipeline).exec(),
      this.barberModel.countDocuments({
        isActive: true,
        "services.serviceId": new Types.ObjectId(serviceId),
      }),
    ]);

    return {
      barbers: barbers.map((barber) =>
        this.mapToBarberUserDetailResponseDto({
          ...barber,
          services: barber.serviceDetails, // map services properly
        }),
      ),
      total: totalCount,
    };
  }
}
