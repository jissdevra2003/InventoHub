import mongoose, { Document, Schema, Types } from 'mongoose';

export type UserRole = "admin" | "manager" | "staff";

// TypeScript interface for one User document
export interface IUser extends Document {
  username: string;
  marketId: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  customRole?: string | null;
  builtInRole?: UserRole | null;
  permissions?: string[];
  isSuperAdmin: boolean;
  address?: string;
  reset_token?: string;
  reset_token_expiry?: Date;
// owned_shops?: Types.ObjectId[];
  assignedShop_id?: Types.ObjectId | null;
  contact_number?: string;
  profile_image?: string;
  is_active: boolean;
  last_login?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
        },
    
    marketId: {
        type: Schema.Types.ObjectId,
        ref: "Market",
        required: true,       
     },

    password: {
      type: String,
      required: true,
    },

    customRole: {
        type: String,
    },

    builtInRole: {
      type: String,
      enum: ["admin", "manager", "staff"],
      default: "staff",
    },

    permissions: {
      type: [String],
      default: [],
        },
    
    isSuperAdmin: {
        type: Boolean,
        default: false,
        },

    // Admin: list of owned shops
    // owned_shops: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "Shop",
    //   },
    // ],

    // Manager / Staff: assigned shop
    assignedShop_id: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },

    contact_number: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
    },

    reset_token: {
      type: String,
    },

    reset_token_expiry: {
      type: Date,
    },

    profile_image: {
      type: String,
      trim: true,
    },

    is_active: {
      type: Boolean,
      default: true,
    },

    last_login: {
      type: Date,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
);

// Export model
export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
