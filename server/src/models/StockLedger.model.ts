import mongoose, { Document, Schema, Types } from 'mongoose';

//IMP : stockledger always creaed for any action that changes stock. So we can track stock changes over time.
//And it is never updated or deleted. Just created for any new action.

//Meaning if you +3 items eg(Product shirt) to stock ,a new stockledgeris created but if u again -3 then another stockledger is created. it is like a record book


//for now these are the change types.may add more later
export type ChangeType = "purchase_order" |
                         "purchase_return" |
                         "sales_order" |
                         "sales_return" | 
                         "stock_adjustment" | 
                         "initial_stock_entry" | 
                         "transfer_in" | 
                         "transfer_out";

// TypeScript interface for one StockLedger document

export interface IStockLedger extends Document {
    market_id: Types.ObjectId;
    shop_id: Types.ObjectId;
    product_id: Types.ObjectId;

    quantity_changed: number;// +3 or -3
    change_type: ChangeType;
    previous_stock: number; // before change
    new_stock: number;//new stock after change

    reason?: string;  //reson for stock change as a Sentence in textArea.
    user_id: Types.ObjectId; // who made the change
    reference_id?: Types.ObjectId; // eg: purchase_order_id or sales_order_id etc. thatiswhy we dont need to store supplier or shop id they are already in PO and PO id is store here

    //only for change_type: transfer : shop to shop in market
    from_shop_id?: Types.ObjectId;
    to_shop_id?: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}


const stockLedgerSchema = new Schema<IStockLedger>({

    market_id: {
        type: Schema.Types.ObjectId,
        ref: "Market",
        required: true,
    },

    shop_id: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
    },

    product_id: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },

    quantity_changed: {
        type: Number,
        required: true,
    },

    change_type: {
        type: String,
        required: true,
        enum: ["purchase_order", "purchase_return", "sales_order", "sales_return", "stock_adjustment", "initial_stock_entry", "transfer_in", "transfer_out"],
        
    },

    previous_stock: {
        type: Number,
        required: true,
    },

    new_stock: {
        type: Number,
        required: true,
    },

    reason: {
        type: String,

    },

    user_id: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    reference_id: {
        type: Schema.Types.ObjectId,
    },

    from_shop_id: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
    },

    to_shop_id: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
    }


}, { timestamps: true });

export const StockLedger = mongoose.models.StockLedger || mongoose.model<IStockLedger>("StockLedger", stockLedgerSchema);