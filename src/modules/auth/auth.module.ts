import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@/database/sql/entities/user.entity';
import { RefreshToken } from '@/database/sql/entities/refresh-token.entity';
import { UsersRepository } from '@/database/sql/repositories/users.repository';
import { RefreshTokensRepository } from '@/database/sql/repositories/refresh-tokens.repository';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken])],
  controllers: [AuthController],
  providers: [AuthService, UsersRepository, RefreshTokensRepository],
  exports: [AuthService],
})
export class AuthModule {}
