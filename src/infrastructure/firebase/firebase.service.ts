import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app!: admin.app.App;
  private initialized = false;

  constructor(private readonly configService: ConfigService) {}

  get isEnabled(): boolean {
    return this.initialized;
  }

  onModuleInit(): void {
    const enabled = this.configService.get<boolean>('firebase.enabled');
    if (!enabled) {
      this.logger.warn('Firebase disabled via FIREBASE_ENABLED flag');
      return;
    }

    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase credentials not configured. Firebase features will be disabled.');
      return;
    }

    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      });
    } else {
      this.app = admin.app();
    }

    this.initialized = true;
    this.logger.log('Firebase Admin initialized');
  }

  getFirestore(): admin.firestore.Firestore {
    if (!this.initialized) {
      throw new Error('Firebase is not initialized. Enable it via FIREBASE_ENABLED=true');
    }
    return this.app.firestore();
  }

  getMessaging(): admin.messaging.Messaging {
    if (!this.initialized) {
      throw new Error('Firebase is not initialized. Enable it via FIREBASE_ENABLED=true');
    }
    return this.app.messaging();
  }

  async sendPushNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<admin.messaging.BatchResponse | null> {
    if (!this.initialized) {
      this.logger.warn('Firebase disabled – push notification dropped');
      return null;
    }
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: data ?? {},
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    };
    return this.getMessaging().sendEachForMulticast(message);
  }
}
