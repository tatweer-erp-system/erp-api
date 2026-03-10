import { Module } from '@nestjs/common';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { ChatGateway } from './controllers/chat.gateway';
import { FirestoreChatService } from './services/firestore-chat.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, FirestoreChatService],
  exports: [ChatService],
})
export class ChatModule {}
