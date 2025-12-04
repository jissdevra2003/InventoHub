import mongoose, { Types, Schema, Document } from "mongoose";

export interface IInventory extends Document {
    market_id: Types.ObjectId;
    shop_id: Types.ObjectId;
    product_id: Types.ObjectId;
    current_stock: number; //imp field 
    min_stock?: number; // alert when stock is below it

    createdAt?: Date;
    updatedAt?: Date;
}

const inventorySchema = new Schema<IInventory>({

    market_id: {
        type: Schema.Types.ObjectId,
        ref: "Market",
        required: true,
        index: true
    },
    
    shop_id: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true
    },

    product_id: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true
    },

    current_stock: {
        type: Number,
        required: true,
        default: 0
    },

    min_stock: {
        type: Number,
        required: false,
    }

}, { timestamps: true });

export const Inventory = mongoose.models.Inventory || mongoose.model<IInventory>("Inventory", inventorySchema);