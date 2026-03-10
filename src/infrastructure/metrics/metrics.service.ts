import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

let promClient: typeof import('prom-client') | null = null;

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  httpRequestsTotal: any;
  httpDurationSeconds: any;
  dbQueryDurationSeconds: any;
  queueDepth: any;
  activeTenantsTotal: any;
  dbPoolUsed: any;
  dbPoolIdle: any;

  async onModuleInit(): Promise<void> {
    try {
      promClient = await import('prom-client');
    } catch {
      this.logger.warn('prom-client not installed. Metrics disabled.');
      return;
    }

    promClient.collectDefaultMetrics({ prefix: 'erp_' });

    this.httpRequestsTotal = new promClient.Counter({
      name: 'erp_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.httpDurationSeconds = new promClient.Histogram({
      name: 'erp_http_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.dbQueryDurationSeconds = new promClient.Histogram({
      name: 'erp_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    });

    this.queueDepth = new promClient.Gauge({
      name: 'erp_queue_depth',
      help: 'Current queue depth',
      labelNames: ['queue'],
    });

    this.activeTenantsTotal = new promClient.Gauge({
      name: 'erp_active_tenants_total',
      help: 'Total active tenants',
    });

    this.dbPoolUsed = new promClient.Gauge({
      name: 'erp_db_pool_used',
      help: 'Database pool used connections',
      labelNames: ['pool'],
    });

    this.dbPoolIdle = new promClient.Gauge({
      name: 'erp_db_pool_idle',
      help: 'Database pool idle connections',
      labelNames: ['pool'],
    });

    this.logger.log('Prometheus metrics initialized');
  }

  async getMetrics(): Promise<string> {
    if (!promClient) return '# prom-client not installed\n';
    return promClient.register.metrics();
  }

  getContentType(): string {
    if (!promClient) return 'text/plain';
    return promClient.register.contentType;
  }
}
