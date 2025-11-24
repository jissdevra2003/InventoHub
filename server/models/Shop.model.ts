import mongoose, { Document, Schema, Types } from "mongoose";

export interface IShop extends Document {
name:string;
shop_code?:string;
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



},
{
timestamps:true
}
)