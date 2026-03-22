export interface ISaleOrderItemDto {
    product_id: string;
    product_name?: string;
    sku?: string;
    quantity: number;
    selling_price: number;
}

export interface CreateSalesOrderDto {
    shop_id: string;
    items: ISaleOrderItemDto[];
    customer_name?: string;
    payment_method?: "cash" | "card" | "upi" | "mixed" | "none";
    notes?: string;
}
