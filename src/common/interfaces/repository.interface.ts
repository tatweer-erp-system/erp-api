import { Transaction } from 'sequelize';

export interface AuditContext {
  userId?: string;
  tenantSlug?: string;
  ip?: string;
  userAgent?: string;
}

export interface QueryOptions {
  where?: Record<string, unknown>;
  include?: unknown[];
  attributes?: string[];
  order?: [string, 'ASC' | 'DESC'][];
  transaction?: Transaction;
  paranoid?: boolean;
}

export interface FindAllOptions extends QueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  lang?: string;
}

export interface CreateOptions {
  transaction?: Transaction;
  auditContext?: AuditContext;
}

export interface UpdateOptions {
  transaction?: Transaction;
  auditContext?: AuditContext;
}

export interface BulkCreateOptions {
  data: Record<string, unknown>[];
  transaction?: Transaction;
  auditContext?: AuditContext;
  updateOnDuplicate?: string[];
}

export interface BulkUpdateOptions {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
  transaction?: Transaction;
  auditContext?: AuditContext;
}
