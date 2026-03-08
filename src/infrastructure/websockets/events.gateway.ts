import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      client.data['userId'] = payload.sub;
      client.data['tenantSlug'] = payload.tenantSlug;
      client.data['roles'] = payload.roles;

      await client.join(`tenant:${payload.tenantSlug}:user:${payload.sub}`);
      for (const role of payload.roles ?? []) {
        await client.join(`tenant:${payload.tenantSlug}:role:${role}`);
      }

      this.logger.debug(`Client connected: ${client.id} user: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:group')
  async handleJoinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    await client.join(`tenant:${tenantSlug}:group:${data.groupId}`);
  }

  @SubscribeMessage('leave:group')
  async handleLeaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { groupId: string },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    await client.leave(`tenant:${tenantSlug}:group:${data.groupId}`);
  }

  emitToUser(tenantSlug: string, userId: string, event: string, data: unknown): void {
    this.server.to(`tenant:${tenantSlug}:user:${userId}`).emit(event, data);
  }

  emitToRole(tenantSlug: string, roleName: string, event: string, data: unknown): void {
    this.server.to(`tenant:${tenantSlug}:role:${roleName}`).emit(event, data);
  }

  emitToGroup(tenantSlug: string, groupId: string, event: string, data: unknown): void {
    this.server.to(`tenant:${tenantSlug}:group:${groupId}`).emit(event, data);
  }

  emitToTenant(tenantSlug: string, event: string, data: unknown): void {
    this.server.to(`tenant:${tenantSlug}`).emit(event, data);
  }
}
