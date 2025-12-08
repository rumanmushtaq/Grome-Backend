import { Barber, BarberSchema } from "@/schemas/barber.schema";
import { User, UserSchema } from "@/schemas/user.schema";
import { Booking, BookingSchema } from "@/schemas/booking.schema";
import {
  Conversation,
  ConversationSchema,
} from "@/schemas/conversation.schema";
import { ChatMessage, ChatMessageSchema } from "@/schemas/chat-message.schema";
import { Category, CategorySchema } from "@/schemas/category.schema";
import { OtpEntity, OtpSchema } from "@/schemas/otp.schema";

export const ENTITIES = [
  { name: User.name, schema: UserSchema },
  { name: Barber.name, schema: BarberSchema },
  { name: Booking.name, schema: BookingSchema },
  { name: Conversation.name, schema: ConversationSchema },
  { name: ChatMessage.name, schema: ChatMessageSchema },
  { name: Category.name, schema: CategorySchema },
  { name: OtpEntity.name, schema: OtpSchema },
];
