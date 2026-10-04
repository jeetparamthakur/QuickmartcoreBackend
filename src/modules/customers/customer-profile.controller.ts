import {
  Body,
  Controller,
  Inject,
  NotFoundException,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { CUSTOMERS_REPOSITORY } from './customers.repository.port';
import type { CustomersRepositoryPort } from './customers.repository.port';

class UpdateCustomerProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;
}

@Controller('customer/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.CUSTOMER)
export class CustomerProfileController {
  constructor(
    @Inject(CUSTOMERS_REPOSITORY)
    private readonly customersRepo: CustomersRepositoryPort,
  ) {}

  @Patch()
  async update(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    const profile = await this.customersRepo.findByUserId(req.user.id);
    if (!profile) throw new NotFoundException('Customer not found');
    profile.fullName = dto.fullName.trim();
    const saved = await this.customersRepo.save(profile);
    return {
      fullName: saved.fullName,
    };
  }
}
