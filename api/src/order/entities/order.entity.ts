import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

export interface OrderGradeItem {
  grade: string;
  price: number;
  quantity: string;
  total: number;
}

export interface OrderCategoryRequest {
  categoryID: string;
  subCategoryID: string;
  requestList: OrderGradeItem[];
}

@Schema({ _id: true })
export class Order {
  @Prop({ required: true })
  orderId: string;

  @Prop({ type: Array, default: [] })
  requestList: OrderCategoryRequest[];

  @Prop({ type: Object })
  transactionParties?: {
    customer?: { roleName: string; name: string; id: string };
    transport?: { roleName: string; name: string; id: string };
    collector?: { roleName: string; name: string; id: string };
  };

  @Prop()
  orderFinishedDate: string;

  @Prop()
  orderFinishedTime: string;

  @Prop({ type: String, enum: ['buy', 'sell'] })
  orderType: 'buy' | 'sell';
}

export const OrderSchema = SchemaFactory.createForClass(Order);
