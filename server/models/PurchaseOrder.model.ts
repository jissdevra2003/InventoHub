import mongoose ,{ Document, Schema, Types } from 'mongoose'


export interface IPurchaseItem {
  product_id: Types.ObjectId;
  quantity: number;
  cost_price: number;

}

export interface IPurchaseOrder extends Document {
  organization_id: Types.ObjectId;
  shop_id: Types.ObjectId;
  supplier_id: Types.ObjectId;
    items: IPurchaseItem[];

  subtotal: number;
  tax_total: number;
  total_amount: number;

  status: "draft" | "submitted" | "received" | "cancelled";

  received_at?: Date;
  notes?: string;

  created_by: Types.ObjectId;        // user_id
  updated_by?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;
}