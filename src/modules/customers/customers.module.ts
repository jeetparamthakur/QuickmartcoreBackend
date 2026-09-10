import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerProfileEntity } from './entities/customer-profile.entity';
import { CustomerAddressEntity } from './entities/customer-address.entity';
import { CustomersRepository } from './customers.repository';
import { CUSTOMERS_REPOSITORY } from './customers.repository.port';
import { CustomerAddressesController } from './customer-addresses.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomerProfileEntity, CustomerAddressEntity]),
  ],
  controllers: [CustomerAddressesController],
  providers: [{ provide: CUSTOMERS_REPOSITORY, useClass: CustomersRepository }],
  exports: [CUSTOMERS_REPOSITORY],
})
export class CustomersModule {}
