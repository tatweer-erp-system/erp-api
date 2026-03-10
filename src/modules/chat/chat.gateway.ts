import {
  WebSocketGateway,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { FirestoreChatService } from './firestore-chat.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly firestoreChatService: FirestoreChatService) {}

  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    const room = `tenant:${tenantSlug}:group:${data.conversationId}`;
    await client.join(room);
    this.logger.debug(`Client ${client.id} joined conversation ${data.conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    const room = `tenant:${tenantSlug}:group:${data.conversationId}`;
    await client.leave(room);
    this.logger.debug(`Client ${client.id} left conversation ${data.conversationId}`);
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ): Promise<void> {
    const tenantSlug = client.data['tenantSlug'];
    const userId = client.data['userId'];
    const room = `tenant:${tenantSlug}:group:${data.conversationId}`;

    client.to(room).emit('chat:typing', {
      conversationId: data.conversationId,
      userId,
    });
  }

  @SubscribeMessage('message')
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

    const room = `tenant:${tenantSlug}:group:${data.conversationId}`;
    this.server.to(room).emit('chat:message', message);
  }
}
