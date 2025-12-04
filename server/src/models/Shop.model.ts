import mongoose, { Document, Schema, Types } from "mongoose";

export interface IShop extends Document {
name:string;
market_id:Types.ObjectId
owner_id:Types.ObjectId;
managers:Types.ObjectId[];
staff:Types.ObjectId[];

address?:string;
city?:string;
state?:string;
country?:string;
postal_code?:string;

contact_number:string;
contact_email:string;

location?:{         //  "?" means optional field
type:"Point";       //type: "Point" → This tells MongoDB this is a GeoJSON Point
coordinates:[number,number];

} | null;                //location can also be null

// //location: {
//   type: "Point",
//   coordinates: [77.5946, 12.9716]  // Bengaluru
// }

isActive:boolean;

createdAt:Date;
updatedAt:Date;


}

const shopSchema=new mongoose.Schema({
name:{
    type:String,
    required:true,
    trim:true
},

market_id:{
type:Schema.Types.ObjectId,
ref:"Market",
required:true

},

// owner (typically a user with role 'owner' or 'admin')
owner_id:{
    type:Schema.Types.ObjectId,
    ref:"User",
    required:true,
    index:true
},
// managers assigned to this shop
managers:[
    {
    type:Schema.Types.ObjectId,
    ref:"User"
}
],

staff:[
{
    type:Schema.Types.ObjectId,
    ref:"User"
}

],
address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
    postal_code: { type: String, trim: true },

    contact_number: { type: String, trim: true },
    contact_email: { type: String, trim: true, lowercase: true },

     // GeoJSON Point for location: [lng, lat]
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        // don't set default here; when omitted, location can be null
      },
    },

    isActive:{
        type:Boolean,
        default:true
    }


},
{
timestamps:true
}
)

//shop model 
export const Shop=mongoose.models.Shop || mongoose.model<IShop>("Shop",shopSchema);