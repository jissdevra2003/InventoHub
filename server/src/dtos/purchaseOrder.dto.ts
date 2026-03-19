import { Types } from "mongoose";

export interface IPurchaseOrderItemDto {
    product_id: string;
    product_name?: string;
    sku: string;
    quantity: number;
    cost_price: number;
}

export interface CreatePurchaseOrderDto {
    shop_id: string;
    supplier_id: string;
    items: IPurchaseOrderItemDto[];
}
