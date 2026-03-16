import { Injectable } from '@nestjs/common';
import { FirestoreChatService } from './firestore-chat.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { AddReactionDto } from '../dto/add-reaction.dto';
import { QueryMessagesDto } from '../dto/query-messages.dto';
import { EventsGateway } from '@/infrastructure/websockets/events.gateway';

@Injectable()
export class ChatService {
  constructor(
    private readonly firestoreChatService: FirestoreChatService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async getConversations(tenantId: string, userId: string) {
    return this.firestoreChatService.getConversations(tenantId, userId);
  }

  async getConversation(tenantId: string, conversationId: string, userId: string) {
    return this.firestoreChatService.getConversationById(tenantId, conversationId);
  }

  async createConversation(tenantId: string, dto: CreateConversationDto, userId: string) {
    const participants = [...new Set([userId, ...dto.participantIds])];
    return this.firestoreChatService.createConversation(tenantId, dto.type, participants, dto.name);
  }

  async getMessages(tenantId: string, conversationId: string, query: QueryMessagesDto) {
    return this.firestoreChatService.getMessages(tenantId, conversationId, {
      limit: query.limit ?? 20,
      before: query.before,
    });
  }

  async sendMessage(tenantId: string, dto: SendMessageDto, userId: string) {
    const message = await this.firestoreChatService.sendMessage(
      tenantId,
      dto.conversationId,
      userId,
      dto.content,
      [],
      dto.replyToId ?? null,
    );

    // Emit WebSocket event to conversation participants
    this.eventsGateway.emitToGroup(tenantId, dto.conversationId, 'chat:message', message);

    return message;
  }

  async addReaction(tenantId: string, messageId: string, emoji: string, userId: string) {
    await this.firestoreChatService.addReactionByMessageId(tenantId, messageId, userId, emoji);
    return { message: 'Reaction added' };
  }

  async removeReaction(tenantId: string, messageId: string, emoji: string, userId: string) {
    await this.firestoreChatService.removeReactionByMessageId(tenantId, messageId, userId, emoji);
    return { message: 'Reaction removed' };
  }

  async markAsRead(tenantId: string, conversationId: string, userId: string) {
    await this.firestoreChatService.markRead(tenantId, conversationId, userId);
    return { message: 'Conversation marked as read' };
  }
}
