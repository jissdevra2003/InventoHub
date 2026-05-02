export const TRANSFER = {
    CREATE: "transfer:create",
    READ:   "transfer:read",
    UPDATE: "transfer:update",   // mark in_transit / complete
    CANCEL: "transfer:cancel",
} as const;
