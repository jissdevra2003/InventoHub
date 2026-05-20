import mongoose, { Schema, Types, Document } from 'mongoose'


export interface ISupplier extends Document {
  market_id: Types.ObjectId;    // The market/business this supplier belongs to


  contact_name?: string;        // Person to contact
  contact_number?: string;
  company_name: string
  email?: string;

  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  gstin?: string;

  // --- Procurement Details ---
  lead_time?: number;               // Days taken to deliver items
  opening_balance: number;          // Initial debt when starting
  credit_limit: number;             // Max debt allowed with this supplier
  payment_terms: string;            // When to pay (e.g. Net 30, Due on Receipt)
  supplier_type: string;            // Business type (e.g. Wholesaler, Manufacturer)
  internal_notes?: string;          // Private notes for staff

  total_purchased?: number;         // Total billed amount (cached)
  total_paid?: number;              // Total amount paid (cached)
  outstanding_balance?: number;     // Remaining debt (purchased - paid) (cached)

  last_bill_date?: Date | null;
  last_bill_amount?: number | null;

  last_payment_date?: Date | null;
  last_payment_amount?: number | null;

  bills_count?: number;             // Total number of bills received

  isActive: boolean;                // Soft delete (active/inactive)

  createdBy: Types.ObjectId;
  

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

    // --- Procurement Fields ---
    lead_time: { type: Number, default: 0 },
    opening_balance: { type: Number, default: 0 },
    credit_limit: { type: Number, default: 0 },
    payment_terms: {
      type: String,
      enum: ["Due on Receipt", "Net 15", "Net 30", "Net 60"],
      default: "Due on Receipt",
    },
    supplier_type: {
      type: String,
      enum: ["Manufacturer", "Wholesaler", "Distributor", "Retailer", "Service Provider"],
      default: "Wholesaler",
    },
    internal_notes: { type: String },

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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true }
);

supplierSchema.index({ market_id: 1, contact_number: 1 }, { unique: true, sparse: true });
supplierSchema.index({ market_id: 1, email: 1 }, { unique: true, sparse: true });


export const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema);