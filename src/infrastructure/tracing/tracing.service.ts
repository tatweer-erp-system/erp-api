import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TracingService.name);
  private sdk: any;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const exporter = this.configService.get<string>('otel.exporter');
    if (!exporter || exporter === 'none') {
      this.logger.log('OpenTelemetry tracing disabled (OTEL_EXPORTER=none)');
      return;
    }

    try {
      const { NodeSDK } = await import('@opentelemetry/sdk-node');
      const { getNodeAutoInstrumentations } =
        await import('@opentelemetry/auto-instrumentations-node');

      const serviceName = this.configService.get<string>('otel.serviceName') ?? 'erp-backend';
      const endpoint = this.configService.get<string>('otel.endpoint');

      let traceExporter: any;

      if (exporter === 'jaeger') {
        const { JaegerExporter } = await import('@opentelemetry/exporter-jaeger');
        traceExporter = new JaegerExporter({ endpoint });
      } else if (exporter === 'otlp') {
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
        traceExporter = new OTLPTraceExporter({ url: endpoint });
      } else {
        this.logger.warn(`Unknown OTEL_EXPORTER: ${exporter}. Tracing disabled.`);
        return;
      }

      this.sdk = new NodeSDK({
        serviceName,
        traceExporter,
        instrumentations: [
          getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': { enabled: false },
          }),
        ],
      });

      this.sdk.start();
      this.logger.log(`OpenTelemetry tracing started (exporter=${exporter})`);
    } catch (err) {
      this.logger.warn('OpenTelemetry packages not installed. Tracing disabled.', err);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.logger.log('OpenTelemetry tracing shut down');
    }
  }
}
