export type Grade = "A" | "B" | "C" | "D";

export type GradeRequest = {
  grade: Grade;
  price: number;
  quantity: string;
  total: number;
};

export type CategoryRequest = {
  categoryName: string;
  subCategoryName: string;
  categoryID: string;
  subCategoryID: string;
  requestList?: GradeRequest[];
};

export type TransactionParty = {
  roleName?: string;
  name?: string;
  id?: string;
};

export type Order = {
  _id?: string | { $oid: string };
  orderId: string;
  orderFinishedDate?: string;
  orderFinishedTime?: string;
  orderType?: "buy" | "sell";
  requestList?: CategoryRequest[];
  transactionParties?: {
    customer?: TransactionParty;
    transport?: TransactionParty;
    collector?: TransactionParty;
  };
};

/** ID used for API (MongoDB _id) or fallback to orderId for display links */
export function getOrderApiId(order: Order): string {
  const id = order._id;
  if (typeof id === "string") return id;
  if (id && typeof (id as { $oid?: string }).$oid === "string")
    return (id as { $oid: string }).$oid;
  return order.orderId;
}

/** Check if id looks like MongoDB ObjectId (24 hex) */
export function isMongoId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}
