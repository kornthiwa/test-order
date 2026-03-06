import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('syncDataTest')
  async syncDataTest() {
    const result = await this.appService.syncAll();
    return {
      message: 'OK',
      ...result,
    };
  }

  @Get('sync/product-list')
  async syncProductList() {
    return this.appService.syncProductList();
  }

  @Get('sync/orders')
  async syncOrders() {
    return this.appService.syncOrders();
  }
}
