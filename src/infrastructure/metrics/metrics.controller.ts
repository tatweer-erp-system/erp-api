import { Controller, Get, Res, ForbiddenException } from '@nestjs/common';
import { Response, Request } from 'express';
import { Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  private readonly allowedNets = ['127.0.0.1', '::1', '10.', '172.16.', '192.168.'];

  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    const allowed = this.allowedNets.some((net) => ip.includes(net));
    if (!allowed) {
      throw new ForbiddenException('Metrics endpoint restricted to internal networks');
    }

    const metrics = await this.metricsService.getMetrics();
    res.set('Content-Type', this.metricsService.getContentType());
    res.end(metrics);
  }
}
