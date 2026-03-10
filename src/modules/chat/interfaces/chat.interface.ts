export interface ConversationInfo {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: string[];
  lastMessage?: MessageInfo;
  unreadCount: number;
  createdAt: Date;
}

export interface MessageInfo {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'image';
  replyTo?: string;
  reactions: Record<string, string[]>;
  readBy: string[];
  createdAt: Date;
}
