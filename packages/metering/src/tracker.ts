import { MeteringService, UsageEvent, createMeteringService, MeteringConfig } from './index';
import pino from 'pino';

const logger = pino({ name: 'usage-tracker' });

export interface TrackerConfig extends MeteringConfig {
  flushInterval?: number;
  batchSize?: number;
}

export class UsageTracker {
  private meteringService: MeteringService;
  private buffer: UsageEvent[] = [];
  private flushInterval: number;
  private batchSize: number;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(config: TrackerConfig) {
    this.meteringService = createMeteringService(config);
    this.flushInterval = config.flushInterval || 5000;
    this.batchSize = config.batchSize || 100;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.flush(), this.flushInterval);
    logger.info({ msg: 'Usage tracker started', flushInterval: this.flushInterval });
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info({ msg: 'Usage tracker stopped' });
  }

  track(event: Omit<UsageEvent, 'timestamp'>): void {
    this.buffer.push({
      ...event,
      timestamp: new Date(),
    } as UsageEvent);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  trackClassification(tenantId: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.track({
      tenantId,
      userId,
      eventType: 'classification',
      quantity: 1,
      metadata,
    });
  }

  trackBatchClassification(tenantId: string, count: number, userId?: string, metadata?: Record<string, unknown>): void {
    this.track({
      tenantId,
      userId,
      eventType: 'batch_classification',
      quantity: count,
      metadata,
    });
  }

  trackApiCall(tenantId: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.track({
      tenantId,
      userId,
      eventType: 'api_call',
      quantity: 1,
      metadata,
    });
  }

  trackExport(tenantId: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.track({
      tenantId,
      userId,
      eventType: 'export',
      quantity: 1,
      metadata,
    });
  }

  trackSearch(tenantId: string, userId?: string, metadata?: Record<string, unknown>): void {
    this.track({
      tenantId,
      userId,
      eventType: 'search',
      quantity: 1,
      metadata,
    });
  }

  async flush(): Promise<void> {
    if (this.isProcessing || this.buffer.length === 0) return;

    this.isProcessing = true;
    const events = [...this.buffer];
    this.buffer = [];

    try {
      await Promise.all(
        events.map((event) =>
          this.meteringService.recordUsage(event).catch((error) => {
            logger.error({ msg: 'Failed to record usage event', error, event });
          })
        )
      );
      logger.debug({ msg: 'Flushed usage events', count: events.length });
    } catch (error) {
      logger.error({ msg: 'Failed to flush usage events', error });
      this.buffer.unshift(...events);
    } finally {
      this.isProcessing = false;
    }
  }

  async shutdown(): Promise<void> {
    this.stop();
    await this.flush();
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  getMeteringService(): MeteringService {
    return this.meteringService;
  }
}

export function createUsageTracker(config: TrackerConfig): UsageTracker {
  return new UsageTracker(config);
}
