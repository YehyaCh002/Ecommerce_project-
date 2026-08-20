import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import { Customer } from '../entities/Customer';

export class CustomerService {
  private customerRepository: Repository<Customer>;

  constructor(customerRepository?: Repository<Customer>) {
    this.customerRepository = customerRepository || AppDataSource.getRepository(Customer);
  }

  async getCustomerById(id: number): Promise<Customer | null> {
    return await this.customerRepository.findOne({ where: { id } });
  }

  async getCustomerByPhoneNumber(phoneNumber: string): Promise<Customer | null> {
    return await this.customerRepository.findOne({ where: { phoneNumber } });
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const customer = this.customerRepository.create(data);
    return await this.customerRepository.save(customer);
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | null> {
    await this.customerRepository.update(id, data);
    return this.getCustomerById(id);
  }

  async findOrCreateOrUpdateCustomer(info: {
    name: string;
    phoneNumber: string;
    email?: string;
    address?: string;
  }): Promise<Customer> {
    let customer = await this.getCustomerByPhoneNumber(info.phoneNumber);

    if (!customer) {
      customer = this.customerRepository.create({
        name: info.name,
        phoneNumber: info.phoneNumber,
        email: info.email,
        defaultAddress: info.address,
      });
      customer = await this.customerRepository.save(customer);
    } else {
      customer.name = info.name;
      if (info.email) customer.email = info.email;
      if (info.address) customer.defaultAddress = info.address;
      await this.customerRepository.save(customer);
    }

    return customer;
  }

  async incrementOrdersCount(customer: Customer): Promise<Customer> {
    customer.totalOrdersCount += 1;
    return await this.customerRepository.save(customer);
  }
}
