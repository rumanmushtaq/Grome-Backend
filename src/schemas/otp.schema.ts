// ** Nest
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type OtpDocument = OtpEntity & Document;

@Schema({ timestamps: true })
export class OtpEntity {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  otp: number;


  @Prop({ required: false }) 
   createdAt: Date; 
}

export const OtpSchema = SchemaFactory.createForClass(OtpEntity);
