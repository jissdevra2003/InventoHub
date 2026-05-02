import { USER } from './componentBasedPerm/user.perm';
import { PRODUCT } from './componentBasedPerm/product.perm';
import { INVENTORY } from './componentBasedPerm/inventory.perm';
import { SHOP } from './componentBasedPerm/shop.perm';
import { SUPPLIER } from './componentBasedPerm/supplier.perm';
import { PURCHASE_ORDER } from './componentBasedPerm/purchaseOrder.perm';
import { SALES_ORDER } from './componentBasedPerm/salesOrder.perm';
import { TRANSFER } from './componentBasedPerm/transfer.perm';


// use like this: PERMISSIONS.USER.INVITE
export const PERMISSIONS = {
    USER,
    PRODUCT,
    INVENTORY,
    SHOP,
    SUPPLIER,
    PURCHASE_ORDER,
    SALES_ORDER,
    TRANSFER,
};


//eg it look like this : ['user:create', 'user:read',....'inventory:transfer'] has all permissions
export const ALL_PERMISSIONS = [
    ...Object.values(USER),
    ...Object.values(PRODUCT),
    ...Object.values(INVENTORY),
    ...Object.values(SHOP),
    ...Object.values(SUPPLIER),
    ...Object.values(PURCHASE_ORDER),
    ...Object.values(SALES_ORDER),
    ...Object.values(TRANSFER),
];

//Only superadmin permissions . Means no one can have these permissions except superadmin
export const ONLY_SUPERADMIN_PERMISSIONS: string[] = [
    PERMISSIONS.SHOP.DELETE
];