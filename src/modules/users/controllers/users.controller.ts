import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { UsersService } from '../services/users.service';
import { CreateUserDto, UpdateUserDto, FilterUserDto } from '../dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get() findAll(@Query() q: FilterUserDto) {
    return this.usersService.findAll(q);
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
  @Post() create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
