import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ProductsService } from '../services/products.service';
import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AssignBulkDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('all', { each: true }) productIds: string[];
}

@ApiTags('branch-products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('branches/:branchId/products')
export class BranchProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @Get() get(@Param('branchId') branchId: string) {
    return this.productsService.getBranchProducts(branchId);
  }
  @Post() assign(@Param('branchId') branchId: string, @Body() dto: AssignBulkDto) {
    return this.productsService.assignBulk(branchId, dto.productIds);
  }
  @Delete(':productId') unassign(
    @Param('branchId') branchId: string,
    @Param('productId') productId: string,
  ) {
    return this.productsService.unassignProduct(branchId, productId);
  }
}
