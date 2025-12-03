import mongoose , {Schema, Types, Document} from 'mongoose'


export interface ISupplier extends Document {
  market_id: Types.ObjectId;    // The market/business this supplier belongs to

  
  contact_name?: string;        // Person to contact
  contact_number?: string;
  company_name:string
  email?: string;

  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  gstin?: string;
  
  total_purchased?: number;         // Total billed amount (cached)
  total_paid?: number;              // Total payment made (cached)
  outstanding_balance?: number;     // total_purchased - total_paid (cached)

  last_bill_date?: Date | null;
  last_bill_amount?: number | null;

  last_payment_date?: Date | null;
  last_payment_amount?: number | null;

  bills_count?: number;             // Number of bills for this supplier// Optional – used if GST needed

  isActive: boolean;            // Soft delete = inactive instead of removing from DB

  createdAt?: Date;
  updatedAt?: Date;
}


const supplierSchema = new Schema<ISupplier>(
  {
    market_id: {
      type: Schema.Types.ObjectId,
      ref: "Market",
      required: true,
      index: true,
    },

    contact_name: { type: String, trim: true },
    contact_number: { type: String, trim: true },

    company_name: {
      type: String,
      required: true,
      trim: true,
    },

    email: { type: String, trim: true, lowercase: true },

    address: { type: String },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postal_code: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },

    gstin: { type: String, trim: true },

    // --- Billing summary cached fields ---
    total_purchased: { type: Number, default: 0 },
    total_paid: { type: Number, default: 0 },
    outstanding_balance: { type: Number, default: 0 },

    last_bill_date: { type: Date, default: null },
    last_bill_amount: { type: Number, default: null },

    last_payment_date: { type: Date, default: null },
    last_payment_amount: { type: Number, default: null },

    bills_count: { type: Number, default: 0 },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Supplier = mongoose.models.Supplier ||  mongoose.model<ISupplier>("Supplier", supplierSchema);