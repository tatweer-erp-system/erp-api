import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '@/database/sql/repositories/users.repository';
import { CreateUserDto, UpdateUserDto, FilterUserDto } from '../dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  findAll(filters: FilterUserDto) {
    return this.usersRepository.findAll(filters, filters.page, filters.limit);
  }
  findById(id: string) {
    return this.usersRepository.findById(id);
  }
  async create(dto: CreateUserDto) {
    const hashed = await bcrypt.hash(dto.password, 10);
    return this.usersRepository.create({ ...dto, password: hashed });
  }
  async update(id: string, dto: UpdateUserDto) {
    const { version, password, ...data } = dto;
    const update: any = { ...data };
    if (password) update.password = await bcrypt.hash(password, 10);
    return this.usersRepository.update(id, version, update);
  }
  remove(id: string) {
    return this.usersRepository.softDelete(id);
  }
}
