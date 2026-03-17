import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BroadcastsService } from './broadcasts.service';

const MAX_SCHEDULER_RETRIES = 3;

/**
 * Cron job that processes scheduled broadcasts every minute.
 * 
 * Retry logic:
 * - Each failed attempt increments failedCount on the broadcast
 * - After 3 consecutive failures, the broadcast is marked FAILED
 * - Prevents infinite retry loops for campaigns with broken templates or audiences
 */
@Injectable()
export class BroadcastSchedulerService {
  private readonly logger = new Logger(BroadcastSchedulerService.name);

  constructor(
    private broadcasts: BroadcastsService,
    private prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledBroadcasts() {
    // 1. Find due broadcasts that haven't exceeded retry limit
    const now = new Date();
    const due = await this.prisma.broadcast.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        failedCount: { lt: MAX_SCHEDULER_RETRIES },
      },
    });

    for (const broadcast of due) {
      this.logger.log(`Processing scheduled broadcast: ${broadcast.name} (attempt ${broadcast.failedCount + 1}/${MAX_SCHEDULER_RETRIES})`);
      try {
        await this.broadcasts.send(broadcast.tenantId, broadcast.id);
        this.logger.log(`Broadcast ${broadcast.name} sent successfully`);
      } catch (err) {
        const newFailCount = broadcast.failedCount + 1;
        this.logger.error(`Broadcast ${broadcast.id} failed (attempt ${newFailCount}/${MAX_SCHEDULER_RETRIES}): ${err}`);

        if (newFailCount >= MAX_SCHEDULER_RETRIES) {
          // Dead-letter: mark as permanently failed
          await this.prisma.broadcast.update({
            where: { id: broadcast.id },
            data: { status: 'FAILED', failedCount: newFailCount },
          });
          this.logger.warn(`Broadcast ${broadcast.name} marked FAILED after ${MAX_SCHEDULER_RETRIES} attempts`);
        } else {
          // Increment retry counter, will be picked up next minute
          await this.prisma.broadcast.update({
            where: { id: broadcast.id },
            data: { failedCount: newFailCount },
          });
        }
      }
    }

    // 2. Log any broadcasts that were skipped due to retry exhaustion
    const exhausted = await this.prisma.broadcast.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        failedCount: { gte: MAX_SCHEDULER_RETRIES },
      },
      select: { id: true, name: true, failedCount: true },
    });

    if (exhausted.length > 0) {
      for (const bc of exhausted) {
        await this.prisma.broadcast.update({
          where: { id: bc.id },
          data: { status: 'FAILED' },
        });
        this.logger.warn(`Dead-lettered broadcast: ${bc.name} (${bc.id}) — ${bc.failedCount} failed attempts`);
      }
    }
  }
}
