/**
 * Type declarations for optional dependencies that may not be installed.
 * The services using these packages handle missing modules at runtime
 * via dynamic imports with try/catch. These declarations satisfy the
 * TypeScript compiler (TS2307).
 */

declare module 'prom-client' {
  export class Registry {
    metrics(): Promise<string>;
    contentType: string;
  }

  export class Counter {
    constructor(config: { name: string; help: string; labelNames?: string[] });
    inc(labels?: Record<string, string>, value?: number): void;
  }

  export class Histogram {
    constructor(config: { name: string; help: string; labelNames?: string[]; buckets?: number[] });
    observe(labels?: Record<string, string>, value?: number): void;
  }

  export class Gauge {
    constructor(config: { name: string; help: string; labelNames?: string[] });
    set(labels: Record<string, string>, value: number): void;
    set(value: number): void;
    inc(labels?: Record<string, string>, value?: number): void;
    dec(labels?: Record<string, string>, value?: number): void;
  }

  export function collectDefaultMetrics(config?: { register?: Registry; prefix?: string }): void;

  export const register: Registry;
}

declare module '@opentelemetry/sdk-node' {
  export class NodeSDK {
    constructor(config: { serviceName?: string; traceExporter?: any; instrumentations?: any[] });
    start(): void;
    shutdown(): Promise<void>;
  }
}

declare module '@opentelemetry/auto-instrumentations-node' {
  export function getNodeAutoInstrumentations(config?: Record<string, any>): any[];
}

declare module '@opentelemetry/exporter-jaeger' {
  export class JaegerExporter {
    constructor(config?: { endpoint?: string });
  }
}

declare module '@opentelemetry/exporter-trace-otlp-http' {
  export class OTLPTraceExporter {
    constructor(config?: { url?: string });
  }
}
