import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BroadcastsService } from './broadcasts.service';

@Injectable()
export class BroadcastSchedulerService {
  private readonly logger = new Logger(BroadcastSchedulerService.name);

  constructor(private broadcasts: BroadcastsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledBroadcasts() {
    await this.broadcasts.processScheduledBroadcasts();
  }
}
