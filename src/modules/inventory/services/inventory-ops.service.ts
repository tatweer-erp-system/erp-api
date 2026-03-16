import { Injectable } from '@nestjs/common';
import { WarehousesRepository } from '@/database/sql/repositories/warehouses.repository';
import { StockLocationsRepository } from '@/database/sql/repositories/stock-locations.repository';
import { InventoryAdjustmentsRepository } from '@/database/sql/repositories/inventory-adjustments.repository';
import { ReorderRulesRepository } from '@/database/sql/repositories/reorder-rules.repository';
import { TransfersRepository } from '@/database/sql/repositories/transfers.repository';
import { StockQuantsRepository } from '@/database/sql/repositories/stock-quants.repository';
import { Warehouse } from '@/database/sql/entities/warehouse.entity';
import { StockLocation } from '@/database/sql/entities/stock-location.entity';
import { InventoryAdjustment } from '@/database/sql/entities/inventory-adjustment.entity';
import { InventoryAdjustmentLine } from '@/database/sql/entities/inventory-adjustment-line.entity';
import { ReorderRule } from '@/database/sql/entities/reorder-rule.entity';
import { Transfer } from '@/database/sql/entities/transfer.entity';
import { TransferLine } from '@/database/sql/entities/transfer-line.entity';
import { LocationType, AdjustmentStatus, TransferStatus } from '@/common/enums/inventory.enums';

// ─── Warehouses ──────────────────────────────────────────────────────────────

@Injectable()
export class InventoryOpsService {
  constructor(
    private readonly warehousesRepo: WarehousesRepository,
    private readonly stockLocationsRepo: StockLocationsRepository,
    private readonly inventoryAdjustmentsRepo: InventoryAdjustmentsRepository,
    private readonly reorderRulesRepo: ReorderRulesRepository,
    private readonly transfersRepo: TransfersRepository,
    private readonly stockQuantsRepo: StockQuantsRepository,
  ) {}

  // ── Warehouses ────────────────────────────────────────────────────────────

  findAllWarehouses(branchId: string, search?: string, isActive?: boolean, page = 1, limit = 20) {
    return this.warehousesRepo.findAll(branchId, search, isActive, page, limit);
  }

  findWarehouseById(id: string): Promise<Warehouse> {
    return this.warehousesRepo.findById(id);
  }

  createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
    return this.warehousesRepo.create(data);
  }

  updateWarehouse(id: string, version: number, data: Partial<Warehouse>): Promise<Warehouse> {
    return this.warehousesRepo.update(id, version, data);
  }

  removeWarehouse(id: string): Promise<void> {
    return this.warehousesRepo.softDelete(id);
  }

  warehousesDropdown(branchId: string) {
    return this.warehousesRepo.findForDropdown(branchId);
  }

  // ── Stock Locations ───────────────────────────────────────────────────────

  findAllStockLocations(
    filters: { warehouseId?: string; locationType?: LocationType; isActive?: boolean } = {},
    page = 1,
    limit = 20,
  ) {
    return this.stockLocationsRepo.findAll(filters, page, limit);
  }

  findStockLocationById(id: string): Promise<StockLocation> {
    return this.stockLocationsRepo.findById(id);
  }

  createStockLocation(data: Partial<StockLocation>): Promise<StockLocation> {
    return this.stockLocationsRepo.create(data);
  }

  updateStockLocation(
    id: string,
    version: number,
    data: Partial<StockLocation>,
  ): Promise<StockLocation> {
    return this.stockLocationsRepo.update(id, version, data);
  }

  removeStockLocation(id: string): Promise<void> {
    return this.stockLocationsRepo.softDelete(id);
  }

  stockLocationsDropdown(warehouseId?: string) {
    return this.stockLocationsRepo.findForDropdown(warehouseId);
  }

  // ── Inventory Adjustments ─────────────────────────────────────────────────

  findAllAdjustments(branchId: string, status?: AdjustmentStatus, page = 1, limit = 20) {
    return this.inventoryAdjustmentsRepo.findAll(branchId, status, page, limit);
  }

  findAdjustmentById(id: string): Promise<InventoryAdjustment> {
    return this.inventoryAdjustmentsRepo.findById(id);
  }

  findAdjustmentWithLines(id: string) {
    return this.inventoryAdjustmentsRepo.findWithLines(id);
  }

  createAdjustment(data: Partial<InventoryAdjustment>): Promise<InventoryAdjustment> {
    return this.inventoryAdjustmentsRepo.create(data);
  }

  upsertAdjustmentLines(adjustmentId: string, lines: Partial<InventoryAdjustmentLine>[]) {
    return this.inventoryAdjustmentsRepo.upsertLines(adjustmentId, lines);
  }

  validateAdjustment(id: string): Promise<InventoryAdjustment> {
    return this.inventoryAdjustmentsRepo.validate(id);
  }

  cancelAdjustment(id: string): Promise<InventoryAdjustment> {
    return this.inventoryAdjustmentsRepo.cancel(id);
  }

  removeAdjustment(id: string): Promise<void> {
    return this.inventoryAdjustmentsRepo.softDelete(id);
  }

  // ── Reorder Rules ─────────────────────────────────────────────────────────

  findAllReorderRules(
    branchId: string,
    filters: { productId?: string; isActive?: boolean } = {},
    page = 1,
    limit = 20,
  ) {
    return this.reorderRulesRepo.findAll(branchId, filters, page, limit);
  }

  findReorderRuleById(id: string): Promise<ReorderRule> {
    return this.reorderRulesRepo.findById(id);
  }

  createReorderRule(data: Partial<ReorderRule>): Promise<ReorderRule> {
    return this.reorderRulesRepo.create(data);
  }

  updateReorderRule(id: string, version: number, data: Partial<ReorderRule>): Promise<ReorderRule> {
    return this.reorderRulesRepo.update(id, version, data);
  }

  removeReorderRule(id: string): Promise<void> {
    return this.reorderRulesRepo.softDelete(id);
  }

  // ── Transfers ─────────────────────────────────────────────────────────────

  findAllTransfers(
    branchId: string,
    filters: { status?: TransferStatus } = {},
    page = 1,
    limit = 20,
  ) {
    return this.transfersRepo.findAll(branchId, filters, page, limit);
  }

  findTransferById(id: string): Promise<Transfer> {
    return this.transfersRepo.findById(id);
  }

  findTransferWithLines(id: string) {
    return this.transfersRepo.findWithLines(id);
  }

  createTransfer(data: Partial<Transfer>): Promise<Transfer> {
    return this.transfersRepo.create(data);
  }

  upsertTransferLines(transferId: string, lines: Partial<TransferLine>[]) {
    return this.transfersRepo.upsertLines(transferId, lines);
  }

  updateTransferStatus(id: string, status: TransferStatus): Promise<Transfer> {
    return this.transfersRepo.updateStatus(id, status);
  }

  removeTransfer(id: string): Promise<void> {
    return this.transfersRepo.softDelete(id);
  }

  // ── Stock Quants ──────────────────────────────────────────────────────────

  getOnHand(branchId: string, productId: string): Promise<number> {
    return this.stockQuantsRepo.getOnHand(branchId, productId);
  }

  getStockByBranch(branchId: string, productId?: string, locationId?: string) {
    return this.stockQuantsRepo.findByBranch(branchId, productId, locationId);
  }
}
