/**
 * TenantSequelizeService — TypeORM compatibility shim.
 *
 * During the Sequelize→TypeORM migration several services still call
 * `this.tenantSequelizeService.getSharedSequelize()` to run raw SQL.
 * This shim wraps the TypeORM DataSource and exposes the same
 * `getSharedSequelize()` surface so those callers keep compiling
 * while the full rewrite continues.
 *
 * The returned "sequelize-like" object only supports `.query()`.
 * Callers that need transactions should be migrated to use
 * TypeORM QueryRunner directly.
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

export interface SequelizeLike {
  query(
    sql: string,
    options?: { replacements?: Record<string, unknown>; type?: string },
  ): Promise<[unknown[], unknown]>;
  transaction(): Promise<SequelizeTransactionLike>;
  addModels(models: unknown[]): void;
}

export interface SequelizeTransactionLike {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  /** Underlying TypeORM QueryRunner — use for TypeORM operations */
  queryRunner: QueryRunner;
}

@Injectable()
export class TenantSequelizeService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Returns a sequelize-compatible facade backed by the TypeORM DataSource.
   * Only `.query()` and `.transaction()` are implemented.
   */
  getSharedSequelize(): SequelizeLike {
    const ds = this.dataSource;

    return {
      addModels(_models: unknown[]) {
        // no-op: Sequelize model registration is not needed in TypeORM
      },

      async query(
        sql: string,
        options?: { replacements?: Record<string, unknown>; type?: string },
      ): Promise<[unknown[], unknown]> {
        const replacements = options?.replacements ?? {};

        // Convert Sequelize-style :param to TypeORM-style $N positional params
        const paramNames: string[] = [];
        const convertedSql = sql.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name: string) => {
          paramNames.push(name);
          return `$${paramNames.length}`;
        });
        const paramValues = paramNames.map((n) => replacements[n] ?? null);

        const result = await ds.query(convertedSql, paramValues);
        // TypeORM returns the result rows directly; simulate Sequelize's [rows, meta]
        return [result as unknown[], { rowCount: Array.isArray(result) ? result.length : 0 }];
      },

      async transaction(): Promise<SequelizeTransactionLike> {
        const qr = ds.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        return {
          queryRunner: qr,
          async commit() {
            await qr.commitTransaction();
            await qr.release();
          },
          async rollback() {
            await qr.rollbackTransaction();
            await qr.release();
          },
        };
      },
    };
  }
}
