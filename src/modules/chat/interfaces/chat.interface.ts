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

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  attachments: string[];
  reactions: Record<string, string[]>;
  replyTo: string | null;
  readBy: Record<string, boolean>;
  deliveredTo: Record<string, boolean>;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'support' | 'group';
  participants: string[];
  name?: string;
  lastMessage: { text: string; senderId: string; timestamp: Date } | null;
  unreadCount: Record<string, number>;
  createdAt: Date;
}
