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
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  formatCustomerFullAddress,
  mergeAddressFields,
  normalizeIndianMobile,
} from './customer-address.util';

class AddressDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ValidateIf((o: AddressDto) => !o.fullAddress)
  @IsString()
  @IsNotEmpty()
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ValidateIf((o: AddressDto) => !o.fullAddress)
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ValidateIf((o: AddressDto) => !o.fullAddress)
  @IsString()
  @Matches(/^\d{6}$/)
  pincode?: string;

  @ValidateIf((o: AddressDto) => !o.fullAddress)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  receiverName?: string;

  @ValidateIf((o: AddressDto) => !o.fullAddress)
  @IsString()
  @Matches(/^[6-9]\d{9}$/)
  receiverPhone?: string;

  /** Legacy clients may send only fullAddress */
  @ValidateIf((o: AddressDto) => !o.addressLine)
  @IsString()
  @IsNotEmpty()
  fullAddress?: string;

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

  private toEntityPayload(dto: Partial<AddressDto>) {
    const receiverPhone = dto.receiverPhone
      ? normalizeIndianMobile(dto.receiverPhone)
      : undefined;
    const fullAddress = formatCustomerFullAddress({
      addressLine: dto.addressLine,
      addressLine2: dto.addressLine2,
      city: dto.city,
      pincode: dto.pincode,
      receiverName: dto.receiverName,
      receiverPhone,
      fullAddress: dto.fullAddress,
    });
    if (!fullAddress) {
      throw new BadRequestException('Address details are required');
    }
    return {
      label: dto.label,
      addressLine: dto.addressLine,
      addressLine2: dto.addressLine2,
      city: dto.city,
      pincode: dto.pincode,
      receiverName: dto.receiverName,
      receiverPhone,
      fullAddress,
      lat: dto.lat,
      lng: dto.lng,
      isDefault: dto.isDefault,
    };
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
    const payload = this.toEntityPayload(dto);
    return this.addresses.save(
      this.addresses.create({
        ...payload,
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

    const merged = mergeAddressFields(existing, {
      addressLine: dto.addressLine,
      addressLine2: dto.addressLine2,
      city: dto.city,
      pincode: dto.pincode,
      receiverName: dto.receiverName,
      receiverPhone: dto.receiverPhone
        ? normalizeIndianMobile(dto.receiverPhone)
        : undefined,
      fullAddress: dto.fullAddress,
    });

    const fullAddress = formatCustomerFullAddress(merged);
    const patch: Partial<CustomerAddressEntity> = {
      ...(dto.label !== undefined ? { label: dto.label } : {}),
      ...(dto.addressLine !== undefined ? { addressLine: dto.addressLine } : {}),
      ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2 } : {}),
      ...(dto.city !== undefined ? { city: dto.city } : {}),
      ...(dto.pincode !== undefined ? { pincode: dto.pincode } : {}),
      ...(dto.receiverName !== undefined ? { receiverName: dto.receiverName } : {}),
      ...(dto.receiverPhone !== undefined
        ? { receiverPhone: normalizeIndianMobile(dto.receiverPhone) }
        : {}),
      ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
      ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      fullAddress: fullAddress || existing.fullAddress,
    };

    await this.addresses.update(id, patch);
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
