export interface UpdateInventoryDto {
    shopId: string;
    productId: string;
    quantity: number;
    reason?: string;
}
