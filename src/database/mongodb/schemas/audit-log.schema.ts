import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AuditLogDocument = HydratedDocument<MongoAuditLog>;

@Schema({ collection: 'audit_logs', timestamps: true })
export class MongoAuditLog {
  @Prop({ required: true, index: true })
  tenantSlug!: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true, index: true })
  module!: string;

  @Prop()
  recordId?: string;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export const MongoAuditLogSchema = SchemaFactory.createForClass(MongoAuditLog);

MongoAuditLogSchema.index({ tenantSlug: 1, createdAt: -1 });
