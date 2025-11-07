import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ThreadDocument = ThreadEntity &
  Document & {
    _id?: any;
  };

@Schema({ timestamps: true })
export class ThreadEntity {
  _id?: any;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  customerId: Object;

  @Prop({ type: MongooseSchema.Types.ObjectId })
  barbarId: Object;

  @Prop({ type: Object })
  lastMessage?: Object;

  @Prop({ default: false })
  customerDeleted: boolean;

  @Prop({ default: false })
  barbarDeleted: boolean;
}

export const ThreadSchema = SchemaFactory.createForClass(ThreadEntity);
