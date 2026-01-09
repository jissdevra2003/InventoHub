import { PERMISSIONS } from "../main.perm";
import { ONLY_SUPERADMIN_PERMISSIONS } from "../main.perm";


export const ADMIN_PERMISSIONS = [

    ...Object.values(PERMISSIONS.USER).filter(perm => !ONLY_SUPERADMIN_PERMISSIONS.includes(perm)),

    ...Object.values(PERMISSIONS.PRODUCT).filter(perm => !ONLY_SUPERADMIN_PERMISSIONS.includes(perm)),

    ...Object.values(PERMISSIONS.INVENTORY).filter(perm => !ONLY_SUPERADMIN_PERMISSIONS.includes(perm))
];