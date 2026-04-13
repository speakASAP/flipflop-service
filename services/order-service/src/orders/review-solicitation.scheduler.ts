import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class ReviewSolicitationScheduler {
  constructor(private readonly ordersService: OrdersService) {}

  @Cron('0 8 * * *', { name: 'flipflop-review-solicitation', timeZone: 'Europe/Prague' })
  async runDailyReviewSolicitation(): Promise<void> {
    await this.ordersService.runReviewSolicitationJob();
  }
}
