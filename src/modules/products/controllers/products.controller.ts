import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ProductsService } from '../services/products.service';
import { CreateProductDto, UpdateProductDto, FilterProductDto } from '../dto/create-product.dto';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get() findAll(@Query() q: FilterProductDto) {
    return this.productsService.findAll(q);
  }
  @Get('dropdown') dropdown(@Query('type') type?: string) {
    return this.productsService.dropdown(type as any);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }
  @Post() create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
