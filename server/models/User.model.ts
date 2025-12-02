import mongoose, {Document,Schema,Types} from 'mongoose';

export type UserRole = "admin" | "manager" | "staff";

//IUser interface represents the TypeScript type of one MongoDB user record.
export interface IUser extends Document 
{
    username:string;
    name:string;
    email:string;
    password: string;
  role: UserRole;
  owned_shops?: Types.ObjectId[];
  shop_id?: Types.ObjectId | null;
  contact_number?: string;
  profile_image?: string;
  is_active: boolean;
  last_login?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

//defining the user document schema
const userSchema = new mongoose.Schema(

{
username:{
type:String,
unique:true,
required:true,
trim:true

},

name:{
    type:String,
    required:true,
    trim:true
},
email:{
type:String,
required:true,
unique:true,
lowercase:true,
trim:true

},

password:{
type:String,
required:true

},

role:{
    type:String,
    enum:["admin","manager","staff"],
    default:"staff"
},

//List of shops owned (only for admins)
//“owned_shops is an ARRAY, and each item inside the array is an ObjectId that refers to a Shop.”
//owned_shops: [ ... ]
owned_shops:
[
{
type:mongoose.Schema.Types.ObjectId,
//ref: "Shop" → these ObjectIds refer to documents in the Shop collection
ref:"Shop"   

}
],

//The shop user works in (for managers/staff)
shop_id:{
type:mongoose.Schema.Types.ObjectId,
ref:"Shop",
default:null,

},
contact_number:{
type:String,
trim:true

},

address:{
type:String

},

reset_token:{
type:String

},
reset_token_expiry:{
type:Date

},
profile_image:{
type:String,
trim:true

},
is_active:{
type:Boolean,
default:true
},

last_login:{
type:Date

},



},
{

    timestamps:true
}

);

//This line creates a User model in Mongoose,
// "User" → is the collection name (Mongoose will actually use "users" in MongoDB — it automatically pluralizes it).

// userSchema → defines what each document (record) looks like.

// <IUser> → tells TypeScript that this model uses the IUser interface for type safety.
export const User=mongoose.model<IUser>("User",userSchema);