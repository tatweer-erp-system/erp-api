import { Injectable } from '@nestjs/common';
import { PartnersRepository } from '@/database/sql/repositories/partners.repository';
import { PaymentTermsRepository } from '@/database/sql/repositories/payment-terms.repository';
import { CreatePartnerDto, UpdatePartnerDto, FilterPartnerDto } from '../dto/create-partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    private readonly partnersRepository: PartnersRepository,
    private readonly paymentTermsRepo: PaymentTermsRepository,
  ) {}

  findAll(f: FilterPartnerDto) {
    return this.partnersRepository.findAll(f, f.page, f.limit);
  }
  findById(id: string) {
    return this.partnersRepository.findById(id);
  }
  create(dto: CreatePartnerDto) {
    return this.partnersRepository.create(dto);
  }
  update(id: string, dto: UpdatePartnerDto) {
    const { version, ...data } = dto;
    return this.partnersRepository.update(id, version, data);
  }
  remove(id: string) {
    return this.partnersRepository.softDelete(id);
  }
  dropdown(isCustomer?: boolean, isSupplier?: boolean) {
    return this.partnersRepository.findForDropdown(isCustomer, isSupplier);
  }

  findAllPaymentTerms(search?: string, page = 1, limit = 20) {
    return this.paymentTermsRepo.findAll(search, page, limit);
  }
  findPaymentTermById(id: string) {
    return this.paymentTermsRepo.findWithLines(id);
  }
  createPaymentTerm(data: any) {
    return this.paymentTermsRepo.create(data);
  }
  updatePaymentTerm(id: string, dto: any) {
    const { version, lines, ...data } = dto;
    return this.paymentTermsRepo.update(id, version, data);
  }
  removePaymentTerm(id: string) {
    return this.paymentTermsRepo.softDelete(id);
  }
  paymentTermsDropdown() {
    return this.paymentTermsRepo.findForDropdown();
  }
}
