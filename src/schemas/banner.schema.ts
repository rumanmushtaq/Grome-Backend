import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  title: string;

  @Prop()
  subtitle: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  redirectUrl: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: null })
  startDate: Date;

  @Prop({ default: null })
  endDate: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);