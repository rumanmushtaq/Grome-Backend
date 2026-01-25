import { Controller, Post, Delete, Param, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BlockService } from "./blocks.service";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { ApiParam, ApiTags } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard)
@ApiTags("blocks")
@Controller("blocks")
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(":userId")
  @ApiParam({ name: "userId", description: "User ID to block" })
  blockUser(
    @CurrentUser() user: { userId: string },
    @Param("userId") blockedId: string,
  ) {
    return this.blockService.blockUser(user.userId, blockedId);
  }

  @Delete(":userId")
  @ApiParam({ name: "userId", description: "User ID to unblock" })
  unblockUser(
    @CurrentUser() user: { userId: string },
    @Param("userId") blockedId: string,
  ) {
    return this.blockService.unblockUser(user.userId, blockedId);
  }
}
