import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ProductsService } from '../services/products.service';

@ApiTags('product-categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(private readonly productsService: ProductsService) {}
  @Get() findAll(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.findAllCategories(search, +page, +limit);
  }
  @Get('dropdown') dropdown() {
    return this.productsService.categoriesDropdown();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.productsService.findCategoryById(id);
  }
  @Post() create(@Body() dto: any) {
    return this.productsService.createCategory(dto);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: any) {
    return this.productsService.updateCategory(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.productsService.removeCategory(id);
  }
}
