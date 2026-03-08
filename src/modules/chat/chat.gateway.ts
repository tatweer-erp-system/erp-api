import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { FirestoreChatService } from './firestore-chat.service';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly firestoreChatService: FirestoreChatService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @SubscribeMessage('chat:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      text: string;
      attachments?: string[];
      replyTo?: string;
    },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    const senderId = client.data['userId'];

    const message = await this.firestoreChatService.sendMessage(
      tenantSlug,
      data.conversationId,
      senderId,
      data.text,
      data.attachments ?? [],
      data.replyTo ?? null,
    );

    this.server
      .to(`tenant:${tenantSlug}:group:${data.conversationId}`)
      .emit('chat:message', message);
  }

  @SubscribeMessage('chat:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    const userId = client.data['userId'];
    await this.firestoreChatService.markRead(tenantSlug, data.conversationId, userId);
  }
}
