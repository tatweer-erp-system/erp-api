import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PartnersService } from '../services/partners.service';
import { CreatePartnerDto, UpdatePartnerDto, FilterPartnerDto } from '../dto/create-partner.dto';

@ApiTags('partners')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}
  @Get() findAll(@Query() q: FilterPartnerDto) {
    return this.partnersService.findAll(q);
  }
  @Get('dropdown') dropdown(
    @Query('isCustomer') isCustomer?: boolean,
    @Query('isSupplier') isSupplier?: boolean,
  ) {
    return this.partnersService.dropdown(isCustomer, isSupplier);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.partnersService.findById(id);
  }
  @Post() create(@Body() dto: CreatePartnerDto) {
    return this.partnersService.create(dto);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partnersService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.partnersService.remove(id);
  }
}
