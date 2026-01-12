import { PERMISSIONS } from "../main.perm";

//for built in role like manager, staff, admin etc
//there are recommended permissions for each role
//you can modify these permissions as per your needs on ui when creating built in roles

export const MANAGER_PERMISSIONS = [
    PERMISSIONS.USER.READ,
    PERMISSIONS.PRODUCT.CREATE,
    PERMISSIONS.PRODUCT.READ,
    PERMISSIONS.PRODUCT.UPDATE,
    PERMISSIONS.INVENTORY.TRANSFER
];