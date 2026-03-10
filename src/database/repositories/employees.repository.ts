import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../base.repository';
import { Employee } from '../entities/employee.entity';

@Injectable()
export class EmployeesRepository extends BaseRepository<Employee> {
  constructor() {
    super(Employee);
  }

  async findByEmployeeId(employeeNumber: string): Promise<Employee | null> {
    return this.findOne({
      where: { employeeNumber },
    });
  }

  async existsByEmployeeId(employeeNumber: string): Promise<boolean> {
    return this.exists({ employee_number: employeeNumber });
  }

  async findByDepartment(departmentId: string): Promise<Employee[]> {
    return this.findAllRaw({
      where: { departmentId },
    });
  }
}
