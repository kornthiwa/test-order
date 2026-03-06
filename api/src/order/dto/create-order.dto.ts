import { OrderCategoryRequest } from '../entities/order.entity';

export class CreateOrderDto {
  orderId: string;
  requestList?: OrderCategoryRequest[];
  transactionParties?: {
    customer?: { roleName: string; name: string; id: string };
    transport?: { roleName: string; name: string; id: string };
    collector?: { roleName: string; name: string; id: string };
  };
  orderFinishedDate?: string;
  orderFinishedTime?: string;
  orderType?: 'buy' | 'sell';
}
