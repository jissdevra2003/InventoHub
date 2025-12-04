import mongoose , {Document, Schema,Types} from 'mongoose'

//The Product model holds global details (Name, SKU, Price, Description).

export interface IProduct extends Document
{
    market_id:Types.ObjectId;
    name:string

  sku: string;                   // unique per market (stock keeping unit)
  description?: string;

  category?: string;
  unit?: string;                 // e.g., "pcs", "kg", "box"
  barcode?: string;              // barcode / EAN / UPC
  
  cost_price?: number;           // average/latest purchase cost (for valuation)
  selling_price?: number;        // default retail price

  stock_quantity?: number;       // simple global stock (V1). Use Stock collection for shop-level.

  

  image_urls?: string[];         // small gallery of image URLs

  attributes?: Record<string, any>; // flexible key/value (size, color, etc.)

  

  createdAt?: Date;
  updatedAt?: Date;
}

const productSchema=new Schema<IProduct>(
{
    market_id:{type:Schema.Types.ObjectId, ref:"Market",
required:true,
index:true

    },
    name:{type:String,required:true,trim:true},
    sku:{type:String,required:true,trim:true},
    description: { type: String, trim: true },

     category: { type: String, trim: true },
    unit: { type: String, trim: true, default: "pcs" },
    barcode: { type: String, trim: true },

    cost_price: { type: Number, default: 0, min: 0 },
    selling_price: { type: Number, default: 0, min: 0 },

    stock_quantity: { type: Number, default: 0 }, // global stock for V1

     image_urls: [{ type: String, trim: true }],
    attributes: { type: Schema.Types.Mixed },

   

   
},
{timestamps:true}

)

export const Product=mongoose.models.Product || mongoose.model<IProduct>("Product",productSchema)