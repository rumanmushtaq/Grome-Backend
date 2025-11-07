import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ThreadController } from "./thread.controller";
import { ThreadService } from "./thread.service";
import { User, UserSchema } from "../../schemas/user.schema";
import { ThreadEntity, ThreadSchema } from "@/schemas/thread.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ThreadEntity.name, schema: ThreadSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ThreadController],
  providers: [ThreadService],
  exports: [ThreadService],
})
export class ThreadModule {}
