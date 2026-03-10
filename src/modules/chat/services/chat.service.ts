import { Injectable } from '@nestjs/common';
import { FirestoreChatService } from './firestore-chat.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { AddReactionDto } from '../dto/add-reaction.dto';
import { QueryMessagesDto } from '../dto/query-messages.dto';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly firestoreChatService: FirestoreChatService,
    private readonly notificationsService: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getConversations(tenantSlug: string, userId: string) {
    return this.firestoreChatService.getConversations(tenantSlug, userId);
  }

  async getConversation(tenantSlug: string, conversationId: string, userId: string) {
    return this.firestoreChatService.getConversationById(tenantSlug, conversationId);
  }

  async createConversation(tenantSlug: string, dto: CreateConversationDto, userId: string) {
    const participants = [...new Set([userId, ...dto.participantIds])];
    return this.firestoreChatService.createConversation(
      tenantSlug,
      dto.type,
      participants,
      dto.name,
    );
  }

  async getMessages(tenantSlug: string, conversationId: string, query: QueryMessagesDto) {
    return this.firestoreChatService.getMessages(tenantSlug, conversationId, {
      limit: query.limit ?? 20,
      before: query.before,
    });
  }

  async sendMessage(tenantSlug: string, dto: SendMessageDto, userId: string) {
    const message = await this.firestoreChatService.sendMessage(
      tenantSlug,
      dto.conversationId,
      userId,
      dto.content,
      [],
      dto.replyToId ?? null,
    );

    // Emit WebSocket event to conversation participants
    this.eventsGateway.emitToGroup(tenantSlug, dto.conversationId, 'chat:message', message);

    return message;
  }

  async addReaction(tenantSlug: string, messageId: string, emoji: string, userId: string) {
    // We need a conversationId to locate the message in Firestore.
    // The gateway pattern stores messages under conversations, so we look up via Firestore.
    await this.firestoreChatService.addReactionByMessageId(tenantSlug, messageId, userId, emoji);
    return { message: 'Reaction added' };
  }

  async removeReaction(tenantSlug: string, messageId: string, emoji: string, userId: string) {
    await this.firestoreChatService.removeReactionByMessageId(tenantSlug, messageId, userId, emoji);
    return { message: 'Reaction removed' };
  }

  async markAsRead(tenantSlug: string, conversationId: string, userId: string) {
    await this.firestoreChatService.markRead(tenantSlug, conversationId, userId);
    return { message: 'Conversation marked as read' };
  }
}
