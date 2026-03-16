import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from '@/database/sql/entities/partner.entity';
import { PaymentTerm } from '@/database/sql/entities/payment-term.entity';
import { PaymentTermLine } from '@/database/sql/entities/payment-term-line.entity';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { PaymentTermsRepository } from '@/database/sql/repositories/payment-terms.repository';
import { PartnersService } from './services/partners.service';
import { PartnersController } from './controllers/partners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, PaymentTerm, PaymentTermLine])],
  controllers: [PartnersController],
  providers: [PartnersService, PartnersRepository, PaymentTermsRepository],
  exports: [PartnersService, PartnersRepository, PaymentTermsRepository],
})
export class PartnersModule {}
