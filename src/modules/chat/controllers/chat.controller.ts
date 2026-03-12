import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { AddReactionDto } from '../dto/add-reaction.dto';
import { QueryMessagesDto } from '../dto/query-messages.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { TenantId } from '@/common/decorators/tenant.decorator';
import { AuthenticatedUser } from '@/common/types/request.types';
import { ModuleFeature } from '@/common/decorators/module-feature.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@ModuleFeature('chat')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  getConversations(@TenantId() tenantId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getConversations(tenantId, user.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a conversation' })
  createConversation(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(tenantId, dto, user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation detail' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  getConversation(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.chatService.getConversation(tenantId, id, user.id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get conversation messages (paginated)' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  getMessages(
    @TenantId() tenantId: string,
    @Param('id') conversationId: string,
    @Query() query: QueryMessagesDto,
  ) {
    return this.chatService.getMessages(tenantId, conversationId, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  sendMessage(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    // Override conversationId from URL param
    dto.conversationId = conversationId;
    return this.chatService.sendMessage(tenantId, dto, user.id);
  }

  @Post('messages/:id/reactions')
  @ApiOperation({ summary: 'Add a reaction to a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  addReaction(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.chatService.addReaction(tenantId, messageId, dto.emoji, user.id);
  }

  @Delete('messages/:id/reactions/:emoji')
  @ApiOperation({ summary: 'Remove a reaction from a message' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiParam({ name: 'emoji', description: 'Emoji to remove' })
  removeReaction(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.chatService.removeReaction(tenantId, messageId, emoji, user.id);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  markAsRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.markAsRead(tenantId, conversationId, user.id);
  }
}
