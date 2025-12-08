import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document, Types } from "mongoose";

export type ServiceDocument = Service & Document;

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ required: false, min: 5 })
  durationMinutes: number;

  /* ==========================
     CATEGORIES (MULTI)
  ========================== */

  @Prop({
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Category",
    required: true,
    index: true,
  })
  categoryIds: Types.ObjectId[];

  @Prop([String])
  tags: string[];

  @Prop([String])
  images: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number;

  @Prop({ default: 0, min: 0 })
  bookingsCount: number;

  @Prop()
  iconUrl?: string;

  @Prop({ default: 0, min: 0 })
  sortOrder: number;

  // Service requirements
  @Prop({
    type: {
      requiresConsultation: { type: Boolean, default: false },
      requiresPreparation: { type: Boolean, default: false },
      preparationTime: { type: Number, default: 0 }, // in minutes
      equipment: [String],
      skills: [String],
    },
    default: {},
  })
  requirements: {
    requiresConsultation: boolean;
    requiresPreparation: boolean;
    preparationTime: number;
    equipment: string[];
    skills: string[];
  };

  // Pricing tiers (if applicable)
  @Prop([
    {
      name: { type: String, required: true },
      price: { type: Number, required: true, min: 0 },
      duration: { type: Number, required: true, min: 15 },
      description: String,
    },
  ])
  pricingTiers: Array<{
    name: string;
    price: number;
    duration: number;
    description?: string;
  }>;

  // Service availability
  @Prop({
    type: {
      isAvailable: { type: Boolean, default: true },
      availableFrom: Date,
      availableTo: Date,
      maxBookingsPerDay: { type: Number, default: 0 }, // 0 = unlimited
    },
    default: {},
  })
  availability: {
    isAvailable: boolean;
    availableFrom?: Date;
    availableTo?: Date;
    maxBookingsPerDay: number;
  };
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

// Indexes
ServiceSchema.index({ category: 1 });
ServiceSchema.index({ isActive: 1 });
ServiceSchema.index({ basePrice: 1 });
ServiceSchema.index({ durationMinutes: 1 });
ServiceSchema.index({ averageRating: -1 });
ServiceSchema.index({ bookingsCount: -1 });
ServiceSchema.index({ tags: 1 });
ServiceSchema.index({ name: "text", description: "text", tags: "text" });
