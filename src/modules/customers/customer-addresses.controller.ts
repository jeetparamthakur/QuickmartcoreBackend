import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { CustomerAddressEntity } from './entities/customer-address.entity';
import { Inject } from '@nestjs/common';
import { CUSTOMERS_REPOSITORY } from './customers.repository.port';
import type { CustomersRepositoryPort } from './customers.repository.port';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotFoundException } from '@nestjs/common';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  @IsNotEmpty()
  fullAddress!: string;

  @IsOptional()
  @IsString()
  lat?: string;

  @IsOptional()
  @IsString()
  lng?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Controller('customer/addresses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.CUSTOMER)
export class CustomerAddressesController {
  constructor(
    @InjectRepository(CustomerAddressEntity)
    private readonly addresses: Repository<CustomerAddressEntity>,
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepo: CustomersRepositoryPort,
  ) {}

  private async customerId(userId: string) {
    const profile = await this.customersRepo.findByUserId(userId);
    if (!profile) throw new NotFoundException('Customer not found');
    return profile.id;
  }

  @Get()
  async list(@Req() req: { user: AuthenticatedUser }) {
    const customerId = await this.customerId(req.user.id);
    return this.addresses.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  @Post()
  async create(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: AddressDto,
  ) {
    const customerId = await this.customerId(req.user.id);
    if (dto.isDefault) {
      await this.addresses.update({ customerId }, { isDefault: false });
    }
    return this.addresses.save(
      this.addresses.create({
        ...dto,
        customerId,
        isDefault: dto.isDefault ?? false,
      }),
    );
  }

  @Patch(':id')
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<AddressDto>,
  ) {
    const customerId = await this.customerId(req.user.id);
    const existing = await this.addresses.findOne({
      where: { id, customerId },
    });
    if (!existing) throw new NotFoundException('Address not found');
    if (dto.isDefault) {
      await this.addresses.update({ customerId }, { isDefault: false });
    }
    await this.addresses.update(id, dto);
    return this.addresses.findOne({ where: { id } });
  }

  @Delete(':id')
  async remove(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const customerId = await this.customerId(req.user.id);
    await this.addresses.delete({ id, customerId });
    return { success: true };
  }
}
