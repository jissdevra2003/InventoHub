import { USER} from './user.perm';
import { PRODUCT } from './product.perm';
import { INVENTORY } from './inventory.perm';


// use like this: PERMISSIONS.USER.INVITE
export const PERMISSIONS = {
    USER,
    PRODUCT,
    INVENTORY
};  


//eg it look like this : ['user:create', 'user:read',....'inventory:transfer'] has all permissions
export const ALL_PERMISSIONS = [
    ...Object.values(USER),
    ...Object.values(PRODUCT),
    ...Object.values(INVENTORY)
];