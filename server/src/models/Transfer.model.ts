import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * A Transfer moves stock of ONE product from one shop to another
 * within the same market.
 *
 * Lifecycle:  pending → in_transit → completed
 *             pending → cancelled
 *
 * StockLedger entries are written ONLY when status moves to "completed":
 *   - transfer_out on from_shop (quantity_changed = -N)
 *   - transfer_in  on to_shop   (quantity_changed = +N)
 */
export interface ITransfer extends Document {
    transfer_number: string;     // TR-00000001
    count: number;               // internal sequence counter (per market)

    market_id: Types.ObjectId;
    from_shop_id: Types.ObjectId;
    to_shop_id: Types.ObjectId;
    product_id: Types.ObjectId;

    quantity: number;

    status: "pending" | "in_transit" | "completed" | "cancelled";

    notes?: string;

    created_by: Types.ObjectId;       // who initiated
    completed_by?: Types.ObjectId;    // who confirmed receipt
    completed_at?: Date;

    createdAt?: Date;
    updatedAt?: Date;
}

const TransferSchema = new Schema<ITransfer>(
    {
        transfer_number: {
            type: String,
            required: true,
            index: true,
            trim: true,
        },

        count: { type: Number, default: 0 },

        market_id: {
            type: Schema.Types.ObjectId,
            ref: "Market",
            required: true,
            index: true,
        },

        from_shop_id: {
            type: Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
        },

        to_shop_id: {
            type: Schema.Types.ObjectId,
            ref: "Shop",
            required: true,
        },

        product_id: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
        },

        status: {
            type: String,
            enum: ["pending", "in_transit", "completed", "cancelled"],
            default: "pending",
        },

        notes: { type: String, trim: true },

        created_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        completed_by: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        completed_at: { type: Date },
    },
    { timestamps: true }
);

// Unique transfer number per market
TransferSchema.index({ market_id: 1, transfer_number: 1 }, { unique: true });

// Fast queries by status+market
TransferSchema.index({ market_id: 1, status: 1, createdAt: -1 });

export const Transfer = mongoose.model<ITransfer>("Transfer", TransferSchema);
