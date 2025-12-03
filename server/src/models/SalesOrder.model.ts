import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Sale item line (one product in the sale)
 */
export interface ISaleItem {
  product_id: Types.ObjectId;
  product_name?: string;   // snapshot (keeps historical name)
  sku?: string;            // snapshot
  quantity: number;
  selling_price: number;   // per unit
  total?: number;          // computed: quantity * selling_price
}

/**
 * Sales Order document (V1)
 */
export interface ISalesOrder extends Document {
  sale_number: string;         // human readable, e.g. SO-00001
  count?: number;           // internal counter for sale number per market

  market_id: Types.ObjectId;   // which market / organization
  shop_id: Types.ObjectId;     // which shop/warehouse sale originated from

  items: ISaleItem[];
  subtotal: number;            // sum of line totals
  total_amount: number;        // same as subtotal for V1 (tax/discount later)

  customer_name?: string;
  payment_method?: "cash" | "card" | "upi" | "mixed" | "none";
  notes?: string;

  status: "completed" | "cancelled";

  created_by: Types.ObjectId;  // who created the sale

  createdAt?: Date;
  updatedAt?: Date;
}

/* ----------------- Schemas ----------------- */

const SaleItemSchema = new Schema<ISaleItem>(
  {
    product_id: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    product_name: { type: String, trim: true },
    sku: { type: String, trim: true },

    quantity: { type: Number, required: true, min: 1 },
    selling_price: { type: Number, required: true, min: 0 },

    total: { type: Number, required: true, min: 0 }
  },
  { _id: true }
);

const SalesOrderSchema = new Schema<ISalesOrder>(
  {
    sale_number: { type: String, required: true, unique: true, index: true, trim: true },
    count: { type: Number, default: 0 },

    market_id: { type: Schema.Types.ObjectId, ref: "Market", required: true, index: true },
    shop_id: { type: Schema.Types.ObjectId, ref: "Shop", required: true },

    items: { type: [SaleItemSchema], required: true, default: [] },

    subtotal: { type: Number, required: true, default: 0 },
    total_amount: { type: Number, required: true, default: 0 },

    customer_name: { type: String, trim: true },
    payment_method: { type: String, enum: ["cash", "card", "upi", "mixed", "none"], default: "none" },
    notes: { type: String, trim: true },

    status: { type: String, enum: ["completed", "cancelled"], default: "completed" },

    created_by: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

/* ----------------- Hooks & Helpers ----------------- */

/**
 * Pre-validate hook:
 *  - Generate market-specific sale_number & count if not provided
 *  - Compute per-line total and order totals if missing
 *
 * Note: this uses this.constructor to query existing documents for the same market
 * to determine the next sequence number. This is fine for low-to-medium concurrency.
 * If you expect very high concurrency you should use a dedicated counter collection
 * (recommended) to guarantee gapless sequences.
 */
SalesOrderSchema.pre<ISalesOrder>("validate", async function (next) {
  try {
    // 1) compute line totals and order totals if not provided
    if (Array.isArray(this.items)) {
      let subtotal = 0;
      for (const it of this.items) {
        const qty = Number(it.quantity || 0);
        const price = Number(it.selling_price || 0);
        const lineTotal = Number((qty * price).toFixed(2));
        it.total = lineTotal;
        subtotal += lineTotal; 
      }
      this.subtotal = Number(subtotal.toFixed(2));
      this.total_amount = Number(this.subtotal.toFixed(2));
    }

    // 2) generate sale_number if not present
    if (!this.sale_number) {
      // find latest sequence for this market
      // Using this.constructor (the model) so code works before model is assigned
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Model: any = this.constructor;
      const last = await Model.findOne({ market_id: this.market_id }).sort({ count: -1 }).select("count").lean();
      const nextCount = (last && last.count ? last.count : 0) + 1;
      this.count = nextCount;
      this.sale_number = `SO-${nextCount.toString().padStart(5, "0")}`;
    }

    next();
  } catch (err) {
    next(err as any);
  }
});

/* ----------------- Indexes ----------------- */

SalesOrderSchema.index({ market_id: 1, shop_id: 1, createdAt: -1 });

/* ----------------- Export ----------------- */

export const SalesOrder = mongoose.model<ISalesOrder>("SalesOrder", SalesOrderSchema);
