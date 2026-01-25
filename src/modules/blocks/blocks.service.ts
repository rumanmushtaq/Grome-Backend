import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";

import {
  ALREADYBLOCKED,
  BLOCKEDYOURSELF,
  FAILEDTO_BLOCK_UNBLOCK,
  InvalidId,
  NotFound,
} from "@/constants/messages.constants";
import { UserBlock } from "@/schemas/user-block.schema";

@Injectable()
export class BlockService {
  constructor(
    @InjectModel(UserBlock.name)
    private readonly blockModel: Model<UserBlock>,
  ) {}

  async blockUser(blockerId: string, blockedId: string) {
    if (
      !Types.ObjectId.isValid(blockerId) ||
      !Types.ObjectId.isValid(blockedId)
    ) {
      throw new BadRequestException(InvalidId("User"));
    }

    if (blockerId === blockedId) {
      throw new ForbiddenException(BLOCKEDYOURSELF);
    }

    const alreadyBlocked = await this.blockModel.exists({
      blockerId,
      blockedId,
    });

    if (alreadyBlocked) {
      throw new ConflictException(ALREADYBLOCKED);
    }

    try {
      return await this.blockModel.create({
        blockerId,
        blockedId,
      });
    } catch (error) {
      throw new InternalServerErrorException(FAILEDTO_BLOCK_UNBLOCK("Block"));
    }
  }

  async unblockUser(blockerId: string, blockedId: string) {
    if (
      !Types.ObjectId.isValid(blockerId) ||
      !Types.ObjectId.isValid(blockedId)
    ) {
      throw new BadRequestException(InvalidId("User"));
    }

    const result = await this.blockModel.deleteOne({
      blockerId,
      blockedId,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(NotFound("Block relationship"));
    }

    return { message: "User unblocked successfully" };
  }

  async isBlocked(userA: string, userB: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userA) || !Types.ObjectId.isValid(userB)) {
      throw new BadRequestException(InvalidId("User"));
    }

    return Boolean(
      await this.blockModel.findOne({
        $or: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      }),
    );
  }

  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    if (
      !Types.ObjectId.isValid(blockerId) ||
      !Types.ObjectId.isValid(blockedId)
    ) {
      throw new BadRequestException(InvalidId("User"));
    }

    return Boolean(
      await this.blockModel.findOne({
        blockerId,
        blockedId,
      }),
    );
  }
}
