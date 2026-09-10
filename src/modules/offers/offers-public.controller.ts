import { Controller, Get } from '@nestjs/common';
import { OffersService } from './offers.service';

@Controller('offers')
export class OffersPublicController {
  constructor(private readonly service: OffersService) {}

  @Get('active')
  listActive() {
    return this.service.listActive();
  }
}
