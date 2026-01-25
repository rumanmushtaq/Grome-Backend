import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class UserBlock {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  blockedId: Types.ObjectId;
}

export const UserBlockSchema = SchemaFactory.createForClass(UserBlock);

export type UserBlockDocument = UserBlock & Document;
UserBlockSchema.index(
  { blockerId: 1, blockedId: 1 },
  { unique: true },
);
