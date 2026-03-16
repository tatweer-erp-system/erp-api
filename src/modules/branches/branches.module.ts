import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '@/database/sql/entities/branch.entity';
import { UserBranch } from '@/database/sql/entities/user-branch.entity';
import { BranchesRepository } from '@/database/sql/repositories/branches.repository';
import { BranchesService } from './services/branches.service';
import { BranchesController } from './controllers/branches.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Branch, UserBranch])],
  controllers: [BranchesController],
  providers: [BranchesService, BranchesRepository],
  exports: [BranchesService, BranchesRepository],
})
export class BranchesModule {}
