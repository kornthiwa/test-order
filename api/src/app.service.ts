import { Injectable } from '@nestjs/common';
import { CategoryService } from './category/category.service';
import { CreateOrderDto } from './order/dto/create-order.dto';
import { OrderService } from './order/order.service';
import { SubCategoryService } from './sub-category/sub-category.service';
import axios from 'axios';
import { OrderCategoryRequest } from './order/entities/order.entity';

const BASE_URL = 'https://apirecycle.unii.co.th';
const PRODUCT_LIST_URL = `${BASE_URL}/category/query-product-demo`;
const TRANSACTION_URL = `${BASE_URL}/Stock/query-transaction-demo`;

type ProductListCategory = {
  categoryId: string;
  categoryName: string;
  subcategory?: Array<{ subCategoryId: string; subCategoryName: string }>;
  subCategory?: Array<{ subCategoryId: string; subCategoryName: string }>;
};

@Injectable()
export class AppService {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly subCategoryService: SubCategoryService,
    private readonly orderService: OrderService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async syncProductList(): Promise<{
    categories: number;
    subCategories: number;
  }> {
    const { data: raw } = await axios.get<
      { productList?: ProductListCategory[] } | ProductListCategory[]
    >(PRODUCT_LIST_URL);
    const list: ProductListCategory[] = Array.isArray(raw)
      ? raw
      : (raw?.productList ?? []);

    let categories = 0;
    let subCategories = 0;

    for (const cat of list) {
      await this.categoryService.upsertByCategoryId({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
      });
      categories += 1;

      const subs = cat.subcategory ?? cat.subCategory ?? [];
      for (const sub of subs) {
        await this.subCategoryService.upsertBySubCategoryId({
          subCategoryId: sub.subCategoryId,
          subCategoryName: sub.subCategoryName,
          categoryId: cat.categoryId,
        });
        subCategories += 1;
      }
    }

    return { categories, subCategories };
  }

  async syncOrders(): Promise<{ orders: number }> {
    const { data } = await axios.get<{
      buyTransaction?: Array<{
        orderId: string;
        requestList?: OrderCategoryRequest[];
        transactionParties?: unknown;
        orderFinishedDate?: string;
        orderFinishedTime?: string;
      }>;
      sellTransaction?: Array<{
        orderId: string;
        requestList?: OrderCategoryRequest[];
        transactionParties?: unknown;
        orderFinishedDate?: string;
        orderFinishedTime?: string;
      }>;
    }>(TRANSACTION_URL);

    const buyOrders = data?.buyTransaction ?? [];
    const sellOrders = data?.sellTransaction ?? [];
    for (const order of buyOrders) {
      await this.orderService.upsertByOrderId({
        orderId: order.orderId,
        requestList: order.requestList ?? [],
        transactionParties:
          order.transactionParties as CreateOrderDto['transactionParties'],
        orderFinishedDate: order.orderFinishedDate,
        orderFinishedTime: order.orderFinishedTime,
        orderType: 'buy',
      });
    }
    for (const order of sellOrders) {
      await this.orderService.upsertByOrderId({
        orderId: order.orderId,
        requestList: order.requestList ?? [],
        transactionParties:
          order.transactionParties as CreateOrderDto['transactionParties'],
        orderFinishedDate: order.orderFinishedDate,
        orderFinishedTime: order.orderFinishedTime,
        orderType: 'sell',
      });
    }
    return { orders: buyOrders.length + sellOrders.length };
  }

  async syncAll(): Promise<{
    categories: number;
    subCategories: number;
    orders: number;
  }> {
    const product = await this.syncProductList();
    const order = await this.syncOrders();
    return {
      categories: product.categories,
      subCategories: product.subCategories,
      orders: order.orders,
    };
  }
}
