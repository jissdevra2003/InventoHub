import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs'

export type UserRole = "admin"|"manager" | "staff";

// TypeScript interface for one User document
export interface IUser extends Document {
  username: string;
  market_id: Types.ObjectId;
  name: string;
  phone?: string;
  email: string;
  password: string;
  customRole?: string | null;
  builtInRole?: UserRole | null;
  permissions?: string[];
  isSuperAdmin: boolean;
  address?: string;
  reset_token?: string;
  reset_token_expiry?: Date;
  assignedShop_id?: Types.ObjectId | null;
  profile_image?: string;
  isActive: boolean;
  last_login?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  status:"invited" | "active" | "disabled";
  
  //Instance methods 
  comparePasswords(candidatePassword:string):Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      unique: true,
      required: function (this: IUser): boolean {    //required only when status is "active"
    return this.status === "active";
      },
      sparse:true,
      trim: true,
    },

    name: {
      type: String,
     required: function (this: IUser): boolean {        //required only when status is "active"
    return this.status === "active";
  },
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
        },
    
    market_id: {
        type: Schema.Types.ObjectId,
        ref: "Market",
        required: true,       
     },

    password: {
      type: String,
      required:function (this:IUser):boolean       //required only when status is "active"
      {
        return this.status==="active";
      }
    },
    status:{
          type:String,
          enum:["invited","active","disabled"],
          default:"invited"
        },

    customRole: {
        type: String,
    },

    builtInRole: {
      type: String,
      enum: ["admin", "manager", "staff"],
      // default: "staff",
    },

    permissions: {
      type: [String],
      default: [],
        },

        
       
    
    isSuperAdmin: {
        type: Boolean,
        default: false,
        },

    // Manager / Staff: assigned shop
    assignedShop_id: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
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

    isActive: {
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


userSchema.pre('save',async function(next)
{
  // Only hash password if it has been modified
   if (!this.isModified('password')) return next();
    
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
})

userSchema.methods.comparePasswords=async function(candidatePassword:string): Promise<boolean>
{
return await bcrypt.compare(candidatePassword,this.password);

}
// Export model
export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
