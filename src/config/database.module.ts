import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Barber, BarberSchema } from "@/schemas/barber.schema";
import { User, UserSchema } from "@/schemas/user.schema";
import { ThreadEntity, ThreadSchema } from "@/schemas/thread.schema";
import { Booking, BookingSchema } from "@/schemas/booking.schema";
import {
  Conversation,
  ConversationSchema,
} from "@/schemas/conversation.schema";
import { ChatMessage, ChatMessageSchema } from "@/schemas/chat-message.schema";

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("database.uri"),
        retryWrites: true,
        w: "majority",
        readPreference: "primary",
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Barber.name, schema: BarberSchema },
      { name: ThreadEntity.name, schema: ThreadSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
})
export class DatabaseModule {}
