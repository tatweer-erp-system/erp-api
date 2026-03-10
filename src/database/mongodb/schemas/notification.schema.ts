import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<MongoNotification>;

@Schema({ collection: 'notifications', timestamps: true })
export class MongoNotification {
  @Prop({ required: true, index: true })
  tenantSlug!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  body?: string;

  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop()
  readAt?: Date;
}

export const MongoNotificationSchema = SchemaFactory.createForClass(MongoNotification);

MongoNotificationSchema.index({ tenantSlug: 1, userId: 1, createdAt: -1 });
