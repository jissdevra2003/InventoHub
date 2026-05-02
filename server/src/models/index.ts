// Central model registry
// Importing all models ensures Mongoose registers schemas
// before they are used anywhere in the app (populate-safe)

import "./User.model";
import "./Market.model";
import "./Shop.model";
import "./Product.model";
import "./Inventory.model";
import "./StockLedger.model";
import "./Supplier.model";
import "./PurchaseOrder.model";
import "./SalesOrder.model";
import "./Invite.model";
import "./Transfer.model";

