import mongoose, { Types, Schema, Document } from "mongoose";

export type subscriptionPlanType = "free" | "basic" | "premium" | "enterprise";


export interface IMarket extends Document {
    market_name: string;
    ownerId?: Types.ObjectId;//may be optional innitially

    logoUrl?: string;
    address?: string;
    market_phone: string;
    market_email: string;

    gstNumber?: string;
    industryType?: string; // retail, wholesale, manufacturing etc. But for now just string

    country?: string;
    state?: string;
    city?: string;
    postal_code?: string;
    currency?: string;
    timezone?: string;

    subscriptionPlan?: subscriptionPlanType; // free / basic / premium
    subscriptionExpiresAt?: Date;

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

//market schema
const marketSchema = new Schema<IMarket>({

    market_name: {
        type: String,
        required: true,
        trim: true
    },

    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
  
    logoUrl: {
        type: String,
        trim: true
    },

    address: {
        type: String,
        trim: true
    },

   market_phone: {
        type: String,
        required: true,
        trim: true
    },

    market_email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
  
    gstNumber: {
        type: String,
        trim: true
    },

    industryType: {
        type: String,
        trim: true
    },

    country: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },

    postal_code: {
        type: String,
        trim: true
    },

    currency: {
        type: String,
        trim: true,
        default: "INR"
    },

    timezone: {
        type: String,
        trim: true,
        default: "Asia/Kolkata"
    },

    subscriptionPlan: {
        type: String,
        enum: ["free", "basic", "premium", "enterprise"],
        default: "free"
    },

    subscriptionExpiresAt: {
        type: Date
    },

    isActive: {
        type: Boolean,
        default: true
    },

},
    { timestamps: true });

//export market model
export const Market = mongoose.models.Market || mongoose.model<IMarket>("Market", marketSchema);