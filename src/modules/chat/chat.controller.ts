import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { AddReactionDto } from './dto/add-reaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantSlug } from '../../common/decorators/tenant.decorator';
import { AuthenticatedUser } from '../../common/types/request.types';
import { ModuleFeature } from '../../common/decorators/module-feature.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@ModuleFeature('chat')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Create a conversation' })
  createConversation(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(tenantSlug, user.id, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations' })
  listConversations(@TenantSlug() tenantSlug: string, @CurrentUser() user: AuthenticatedUser) {
    return this.chatService.listConversations(tenantSlug, user.id);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message' })
  sendMessage(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(tenantSlug, user.id, conversationId, dto);
  }

  @Post('conversations/:conversationId/messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add reaction to message' })
  addReaction(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.chatService.addReaction(tenantSlug, conversationId, messageId, user.id, dto);
  }

  @Patch('conversations/:id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  markRead(
    @TenantSlug() tenantSlug: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') conversationId: string,
  ) {
    return this.chatService.markRead(tenantSlug, conversationId, user.id);
  }
}
