export interface ListOrderQuery {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  orderType?: 'buy' | 'sell';
  categoryId?: string;
  subCategoryId?: string;
  orderId?: string;
  orderIdMatchMode?: 'exact' | 'contains';
  priceMin?: number;
  priceMax?: number;
  grade?: 'ALL' | 'A' | 'B' | 'C' | 'D';
}
