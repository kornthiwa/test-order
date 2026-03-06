import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrderQuery } from './dto/list-order-query.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @Get('list')
  async findAll(@Query() query: Record<string, string>) {
    const q: ListOrderQuery = {
      page: query.page ? parseInt(query.page, 10) : 1,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : 10,
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
      orderType: (query.orderType as ListOrderQuery['orderType']) || undefined,
      categoryId: query.categoryId || undefined,
      subCategoryId: query.subCategoryId || undefined,
      orderId: query.orderId || undefined,
      orderIdMatchMode:
        (query.orderIdMatchMode as 'exact' | 'contains') || 'contains',
      priceMin: query.priceMin ? parseFloat(query.priceMin) : undefined,
      priceMax: query.priceMax ? parseFloat(query.priceMax) : undefined,
      grade: (query.grade as ListOrderQuery['grade']) || 'ALL',
    };
    return this.orderService.findAllWithFilters(q);
  }

  @Get('summary')
  async summarize(@Query() query: Record<string, string>) {
    const q: ListOrderQuery = {
      dateFrom: query.dateFrom || undefined,
      dateTo: query.dateTo || undefined,
      orderType: (query.orderType as ListOrderQuery['orderType']) || undefined,
      categoryId: query.categoryId || undefined,
      subCategoryId: query.subCategoryId || undefined,
      orderId: query.orderId || undefined,
      orderIdMatchMode:
        (query.orderIdMatchMode as 'exact' | 'contains') || 'contains',
      priceMin: query.priceMin ? parseFloat(query.priceMin) : undefined,
      priceMax: query.priceMax ? parseFloat(query.priceMax) : undefined,
      grade: (query.grade as ListOrderQuery['grade']) || 'ALL',
    };
    return this.orderService.summarize(q);
  }

  @Get('by-order-id/:orderId')
  findByOrderId(@Param('orderId') orderId: string) {
    return this.orderService.findByOrderId(orderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(id);
  }
}
