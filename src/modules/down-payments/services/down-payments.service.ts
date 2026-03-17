import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Transaction } from 'sequelize';
import { DownPaymentsRepository } from '@/database/sql/repositories/down-payments.repository';
import { SalesOrdersRepository } from '@/database/sql/repositories/sales-orders.repository';
import { CreateDownPaymentDto } from '../dto/create-down-payment.dto';
import { AuditContext } from '@/common/interfaces/repository.interface';
import { AuditSharedService } from '@/shared/services/audit-shared.service';
import { DownPaymentType } from '@/common/enums/pricelist.enums';

@Injectable()
export class DownPaymentsService {
  constructor(
    private readonly downPaymentsRepository: DownPaymentsRepository,
    private readonly salesOrdersRepository: SalesOrdersRepository,
    private readonly auditService: AuditSharedService,
  ) {}

  async findBySaleOrder(tenantId: string, saleOrderId: string) {
    return this.downPaymentsRepository.findBySaleOrderId(tenantId, saleOrderId);
  }

  async create(
    tenantId: string,
    saleOrderId: string,
    dto: CreateDownPaymentDto,
    auditContext: AuditContext,
  ) {
    // Verify the sales order exists
    const order = await this.salesOrdersRepository.findOneById(tenantId, saleOrderId);
    if (!order) {
      throw new NotFoundException(`Sales order with id ${saleOrderId} not found`);
    }

    const orderTotal = parseFloat(order.totalAmount ?? order.total ?? '0');

    // Compute the down payment amount
    let amount: number;
    if (dto.type === DownPaymentType.PERCENTAGE) {
      if (dto.value < 0 || dto.value > 100) {
        throw new BadRequestException('Percentage must be between 0 and 100');
      }
      amount = Math.round(orderTotal * dto.value) / 100;
    } else {
      amount = dto.value;
    }

    amount = Math.round(amount * 100) / 100;

    if (amount <= 0) {
      throw new BadRequestException('Down payment amount must be greater than 0');
    }

    if (amount > orderTotal) {
      throw new BadRequestException('Down payment amount cannot exceed the order total');
    }

    const id = await this.downPaymentsRepository.insertDownPayment(tenantId, {
      branchId: dto.branchId,
      saleOrderId,
      invoiceId: dto.invoiceId ?? null,
      type: dto.type,
      value: dto.value,
      amount,
      createdBy: auditContext.userId ?? null,
    });

    const record = await this.downPaymentsRepository.findOneById(tenantId, id);

    await this.auditService.logCreate(
      tenantId,
      'sales.down_payments',
      id,
      record,
      auditContext.userId,
    );

    return record;
  }

  async deductAll(
    tenantId: string,
    saleOrderId: string,
    finalInvoiceId: string,
    auditContext: AuditContext,
    containerTransaction?: Transaction,
  ) {
    const isOwner = !containerTransaction;
    const transaction = await this.downPaymentsRepository.createTransaction({
      transaction: containerTransaction,
    });

    try {
      const total = await this.downPaymentsRepository.getUndeductedTotal(
        tenantId,
        saleOrderId,
        transaction,
      );

      if (total <= 0) {
        if (isOwner) await transaction.commit();
        return { deductedTotal: 0 };
      }

      await this.downPaymentsRepository.markDeducted(
        tenantId,
        saleOrderId,
        auditContext.userId ?? null,
        transaction,
      );

      if (isOwner) await transaction.commit();

      await this.auditService.logStatusChange(
        tenantId,
        'sales.down_payments',
        saleOrderId,
        'pending',
        'deducted',
        auditContext.userId,
      );

      return { deductedTotal: total, finalInvoiceId };
    } catch (e) {
      if (isOwner) await transaction.rollback();
      throw e;
    }
  }
}
