import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AuthenticatedUser,
  Roles,
} from '../../common/decorators/auth.decorators';
import { UserType } from '../../common/enums';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffService } from './staff.service';

@Controller('seller/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserType.SELLER, UserType.STORE_OWNER)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  listStaff(@Req() req: { user: AuthenticatedUser }) {
    return this.staffService.listStaff(req.user.id, req.user.userType);
  }

  @Post()
  createStaff(
    @Req() req: { user: AuthenticatedUser },
    @Body() dto: CreateStaffDto,
  ) {
    return this.staffService.createStaff(req.user.id, req.user.userType, dto);
  }

  @Delete(':id')
  deleteStaff(
    @Req() req: { user: AuthenticatedUser },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.staffService.deleteStaff(req.user.id, req.user.userType, id);
  }
}
