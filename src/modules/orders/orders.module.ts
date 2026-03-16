import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderInvoiceService } from './order-invoice.service';
import { CouponsModule } from '../coupons/coupons.module';
@Module({
  imports: [CouponsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderInvoiceService],
  exports: [OrdersService, OrderInvoiceService],
})
export class OrdersModule {}
