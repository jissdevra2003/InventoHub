// Frontend mirror of the backend permission constants.
// Used by the invite modal to render the Zoho-style permission checklist.
// IMPORTANT: Keep in sync with server/src/permissions/componentBasedPerm/*.perm.ts

export const ALL_PERMISSIONS: string[] = [
  // User
  "user:create",
  "user:read",
  "user:update",
  "user:delete",
  "user:invite",
  // Product
  "product:create",
  "product:read",
  "product:update",
  "product:delete",
  // Inventory
  "inventory:view",
  "inventory:adjust",
  "inventory:transfer",
  "inventory:delete",
  // Shop
  "shop:create",
  "shop:read",
  "shop:update",
  "shop:delete",
  "shop:assign_user",
  "shop:remove_user",
  // Supplier
  "supplier:create",
  "supplier:read",
  "supplier:update",
  "supplier:delete",
  // Purchase Order
  "purchase_order:create",
  "purchase_order:read",
  "purchase_order:update",
  "purchase_order:delete",
  "purchase_order:receive",
  "purchase_order:return",
  // Sales Order
  "sales_order:create",
  "sales_order:read",
  "sales_order:cancel",
  "sales_order:return",
  // Transfer
  "transfer:create",
  "transfer:read",
  "transfer:update",
  "transfer:cancel",
];
