import mongoose ,{ Document, Schema, Types } from 'mongoose'


export interface IPurchaseItem {
  product_id: Types.ObjectId;
  product_name?:string
  sku:string
  quantity: number;
  cost_price: number;

}

export interface IPurchaseOrder extends Document {
  organization_id: Types.ObjectId;
  shop_id: Types.ObjectId;
  supplier_id: Types.ObjectId;
    items: IPurchaseItem[];
  subtotal: number;
  total_amount: number;
  status: "draft"  | "received" | "cancelled";
    created_by: Types.ObjectId;        // user_id
  createdAt?: Date;
  updatedAt?: Date;
}

const PurchaseItemSchema=new Schema<IPurchaseItem>(
{
product_id:{
type:Schema.Types.ObjectId,
ref: "Product", 
required: true

},
quantity: { type: Number,
   required: true,
    min: 1
   },
   product_name:{
    type:String,

   },

   sku:{
    type:String,
    required:true
   },

   cost_price:{
    type:Number,
    required:true,
    min:0
   }

},
{ _id: true }

)


const PurchaseOrderSchema=new Schema<IPurchaseOrder>(
  {
organization_id:{
type:Schema.Types.ObjectId,
ref:"Organization",
required:true

},
shop_id:{
type:Schema.Types.ObjectId,
ref:"Shop"
},
supplier_id:{
  type:Schema.Types.ObjectId,
  ref:"Supplier",
  required:true
},
items: { type: [PurchaseItemSchema],
   required: true,
    default: [] 
  },
  subtotal: { type: Number,
     required: true,
      default: 0 
    },

    total_amount: { type: Number,
       required: true,
        default: 0 
      },

      status: { type: String,
         enum: ["draft", "received", "cancelled"],
          default: "draft" 
        },

        created_by: { type: Schema.Types.ObjectId,
           ref: "User",
            required: true
           }


  },
  {timestamps:true}

);

export const PurchaseOrder=mongoose.model<IPurchaseOrder>("PurchaseOrder",PurchaseOrderSchema);