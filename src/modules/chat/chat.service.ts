import { Injectable, ForbiddenException } from '@nestjs/common';
import { FirestoreChatService } from './firestore-chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly firestoreChatService: FirestoreChatService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createConversation(tenantSlug: string, userId: string, dto: CreateConversationDto) {
    const participants = [...new Set([userId, ...dto.participantIds])];
    return this.firestoreChatService.createConversation(
      tenantSlug,
      dto.type,
      participants,
      dto.name,
    );
  }

  async listConversations(tenantSlug: string, userId: string) {
    return this.firestoreChatService.getConversations(tenantSlug, userId);
  }

  async sendMessage(
    tenantSlug: string,
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const message = await this.firestoreChatService.sendMessage(
      tenantSlug,
      conversationId,
      userId,
      dto.text,
      dto.attachments ?? [],
      dto.replyTo ?? null,
    );

    return message;
  }

  async addReaction(
    tenantSlug: string,
    conversationId: string,
    messageId: string,
    userId: string,
    dto: AddReactionDto,
  ) {
    await this.firestoreChatService.addReaction(
      tenantSlug,
      conversationId,
      messageId,
      userId,
      dto.emoji,
    );
  }

  async markRead(tenantSlug: string, conversationId: string, userId: string) {
    await this.firestoreChatService.markRead(tenantSlug, conversationId, userId);
  }
}
