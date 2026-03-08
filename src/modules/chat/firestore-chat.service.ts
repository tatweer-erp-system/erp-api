import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../infrastructure/firebase/firebase.service';
import { v4 as uuidv4 } from 'uuid';

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

@Injectable()
export class FirestoreChatService {
  private readonly logger = new Logger(FirestoreChatService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  private conversationRef(tenantSlug: string, conversationId: string) {
    return this.firebaseService
      .getFirestore()
      .collection('tenants')
      .doc(tenantSlug)
      .collection('conversations')
      .doc(conversationId);
  }

  async createConversation(
    tenantSlug: string,
    type: 'direct' | 'support' | 'group',
    participants: string[],
    name?: string,
  ): Promise<Conversation> {
    const id = uuidv4();
    const conversation: Conversation = {
      id,
      type,
      participants,
      name,
      lastMessage: null,
      unreadCount: Object.fromEntries(participants.map((p) => [p, 0])),
      createdAt: new Date(),
    };

    await this.conversationRef(tenantSlug, id).set(conversation);
    return conversation;
  }

  async sendMessage(
    tenantSlug: string,
    conversationId: string,
    senderId: string,
    text: string,
    attachments: string[] = [],
    replyTo: string | null = null,
  ): Promise<ChatMessage> {
    const messageId = uuidv4();
    const message: ChatMessage = {
      id: messageId,
      senderId,
      text,
      attachments,
      reactions: {},
      replyTo,
      readBy: { [senderId]: true },
      deliveredTo: { [senderId]: true },
      createdAt: new Date(),
      deletedAt: null,
    };

    const convRef = this.conversationRef(tenantSlug, conversationId);
    const batch = this.firebaseService.getFirestore().batch();

    batch.set(convRef.collection('messages').doc(messageId), message);
    batch.update(convRef, {
      lastMessage: { text, senderId, timestamp: message.createdAt },
    });

    await batch.commit();

    // Increment unread count for other participants
    const convDoc = await convRef.get();
    if (convDoc.exists) {
      const data = convDoc.data() as Conversation;
      const updates: Record<string, number> = {};
      for (const p of data.participants) {
        if (p !== senderId) {
          updates[`unreadCount.${p}`] = (data.unreadCount[p] ?? 0) + 1;
        }
      }
      if (Object.keys(updates).length > 0) {
        await convRef.update(updates);
      }
    }

    return message;
  }

  async addReaction(
    tenantSlug: string,
    conversationId: string,
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<void> {
    const msgRef = this.conversationRef(tenantSlug, conversationId)
      .collection('messages')
      .doc(messageId);

    const doc = await msgRef.get();
    if (!doc.exists) return;

    const data = doc.data() as ChatMessage;
    const reactions = data.reactions ?? {};
    if (!reactions[emoji]) reactions[emoji] = [];
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    await msgRef.update({ reactions });
  }

  async markRead(
    tenantSlug: string,
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const convRef = this.conversationRef(tenantSlug, conversationId);
    await convRef.update({ [`unreadCount.${userId}`]: 0 });

    // Mark all unread messages as read
    const messagesRef = convRef.collection('messages')
      .where(`readBy.${userId}`, '==', false)
      .limit(50);

    const snapshot = await messagesRef.get();
    const batch = this.firebaseService.getFirestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { [`readBy.${userId}`]: true });
    });
    await batch.commit();
  }

  async getConversations(tenantSlug: string, userId: string): Promise<Conversation[]> {
    const snapshot = await this.firebaseService
      .getFirestore()
      .collection('tenants')
      .doc(tenantSlug)
      .collection('conversations')
      .where('participants', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs.map((d) => d.data() as Conversation);
  }
}
