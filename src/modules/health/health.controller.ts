import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok', service: 'm3bd' };
  }

  @Public()
  @Get('live')
  live() {
    return { status: 'alive' };
  }

  @Public()
  @Get('ready')
  ready() {
    return { status: 'ready' };
  }
}
