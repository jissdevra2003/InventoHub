export const PURCHASE_ORDER = {
    CREATE: "purchase_order:create",
    READ:   "purchase_order:read",
    UPDATE: "purchase_order:update",
    DELETE: "purchase_order:delete",   // For cancelling
    RECEIVE: "purchase_order:receive",
    RETURN: "purchase_order:return",   // For returning received goods
} as const;

