import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ChatGateway } from "./chat.gateway";
import {
  Conversation,
  ConversationSchema,
} from "../../schemas/conversation.schema";
import {
  ChatMessage,
  ChatMessageSchema,
} from "../../schemas/chat-message.schema";
import { User, UserSchema } from "../../schemas/user.schema";
import { NotificationsModule } from "../notifications/notifications.module";
import { Barber, BarberSchema } from "@/schemas/barber.schema";
import { UserBlock, UserBlockSchema } from "@/schemas/user-block.schema";
import { BlockModule } from "../blocks/blocks.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
      { name: Barber.name, schema: BarberSchema },
      { name: UserBlock.name, schema: UserBlockSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: {
          expiresIn: configService.get<string>("jwt.expiresIn"),
        },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
    BlockModule
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
