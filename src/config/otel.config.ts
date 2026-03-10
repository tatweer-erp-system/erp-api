export const otelConfig = () => ({
  otel: {
    exporter: process.env.OTEL_EXPORTER || 'none',
    endpoint: process.env.OTEL_ENDPOINT || 'http://localhost:14268/api/traces',
    serviceName: process.env.OTEL_SERVICE_NAME || 'erp-backend',
  },
});
