import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateThreadDto } from './dto/thread.dto';

import { ObjectId } from 'mongodb';
// import {
//   MessageDocument,
//   MessageEntity,
// } from 'src/database/schemas/message.schema';
// import { User, UserDocument } from 'src/database/schemas/user.schema';




import { ThreadDocument, ThreadEntity } from '@/schemas/thread.schema';
import { BarberDocument } from '@/schemas/barber.schema';
import { User, UserDocument } from '@/schemas/user.schema';
const path = require('path');
const filename = path.basename(__filename);

@Injectable()
export class ThreadService {
  constructor(
    @InjectModel(ThreadEntity.name)
    private readonly threadModel: Model<ThreadDocument>,

    // @InjectModel(MessageEntity.name)
    // private readonly messageModel: Model<MessageDocument>,

    // @InjectModel(User.name) private readonly userModel: Model<UserDocument>,

    
    // private readonly barbarModel: Model<BarberDocument>,

    // @Inject(LogService) private readonly logService: LogService,
  ) {}

  // async getUserChatThreads(user: User): Promise<ThreadDocument[]> {
  //   try {
  //     const vendor = await this.vendorModel.findOne({ userId: user._id });

  //     let filter = {};

  //     if (user.role === Role.VENDOR && vendor !== null) {
  //       filter = {
  //         vendorId: vendor._id,
  //         vendorDeleted: false,
  //       };
  //     } else {
  //       filter = {
  //         customerId: user._id,
  //         customerDeleted: false,
  //       };
  //     }

  //     let lookupQuery;
  //     if (user.role === Role.VENDOR) {
  //       lookupQuery = [
  //         {
  //           $match: filter,
  //         },
  //         {
  //           $sort: { createdAt: -1 },
  //         },
  //         {
  //           $lookup: {
  //             from: 'users',
  //             localField: 'customerId',
  //             foreignField: '_id',
  //             as: 'receiver',
  //           },
  //         },
  //       ];
  //     } else {
  //       lookupQuery = [
  //         {
  //           $match: filter,
  //         },
  //         {
  //           $sort: { createdAt: -1 },
  //         },
  //         {
  //           $lookup: {
  //             from: 'vendorentities',
  //             localField: 'vendorId',
  //             foreignField: '_id',
  //             as: 'vendor',
  //           },
  //         },
  //         {
  //           $lookup: {
  //             from: 'users',
  //             let: { userId: { $arrayElemAt: ['$vendor.userId', 0] } },
  //             pipeline: [
  //               {
  //                 $match: { $expr: { $eq: ['$_id', '$$userId'] } },
  //               },
  //             ],
  //             as: 'receiver',
  //           },
  //         },
  //       ];
  //     }

  //     return await this.threadModel.aggregate(lookupQuery);
  //   } catch (error) {
  //     await this.logService.create({
  //       message: error.message,
  //       dir: filename,
  //       type: ErrorStatus.ERROR,
  //       errorCode: HttpStatus.FORBIDDEN,
  //     });

  //     throw new BadRequestException(error.message);
  //   }
  // }

  // async adminGetAllThreads(query) {
  //   query.page = +query.page === 0 ? 1 : +query.page;
  //   const page = query.page || DEFAULT_PAGINATION_PAGE;
  //   const limit = +query.limit || DEFAULT_PAGINATION_LIMIT;
  //   const skip = (page - 1) * limit;

  //   const total = await this.threadModel.countDocuments();

  //   const data = await this.threadModel.aggregate([
  //     {
  //       $lookup: {
  //         from: 'vendorentities',
  //         localField: 'vendorId',
  //         foreignField: '_id',
  //         as: 'vendor',
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: 'users',
  //         localField: 'customerId',
  //         foreignField: '_id',
  //         as: 'customer',
  //       },
  //     },
  //     {
  //       $sort: { createdAt: -1 },
  //     },
  //     {
  //       $skip: skip,
  //     },
  //     {
  //       $limit: limit,
  //     },
  //   ]);

  //   return {
  //     data,
  //     total,
  //   };
  // }

  async create(user: User, payload: CreateThreadDto): Promise<object> {
    try {
      const { customerId, barbarId } = payload;

      // if (user.role === Role.USER) {
      //   if (String(customerId) === String(vendorId)) {
      //     throw new BadRequestException(`You can't send message to youself!`);
      //   }
      // } else if (user.role === Role.VENDOR) {
      //   if (String(vendorId) === String(vendorId)) {
      //     throw new BadRequestException(`You can't send message to youself!`);
      //   }
      // }

      const res = await this.threadModel.findOneAndUpdate(
        payload,
        {
          ...payload,
          customerDeleted: false,
          barbarDeleted: false,
        },
        { new: true, upsert: true, returnOriginal: false },
      );

      return {
        status: 200,
        message: 'Chat thread created successfully!',
        payload: res,
      };
    } catch (error) {
      // await this.logService.create({
      //   message: error.message,
      //   dir: filename,
      //   type: ErrorStatus.ERROR,
      //   errorCode: HttpStatus.FORBIDDEN,
      // });

      throw new BadRequestException(error.message);
    }
  }

  // async delete(threadId: ObjectId, user: User): Promise<object> {
  //   try {
  //     if (user.role === Role.VENDOR) {
  //       await this.threadModel.findOneAndUpdate(
  //         threadId,
  //         {
  //           vendorDeleted: true,
  //         },
  //         { upsert: true },
  //       );
  //     } else {
  //       await this.threadModel.findOneAndUpdate(
  //         threadId,
  //         {
  //           customerDeleted: true,
  //         },
  //         { upsert: true },
  //       );
  //     }

  //     return {
  //       status: 200,
  //       message: 'Chat deleted successfully!',
  //       payload: {},
  //     };
  //   } catch (error) {
  //     await this.logService.create({
  //       message: error.message,
  //       dir: filename,
  //       type: ErrorStatus.ERROR,
  //       errorCode: HttpStatus.FORBIDDEN,
  //     });

  //     throw new BadRequestException(error.message);
  //   }
  // }
}
