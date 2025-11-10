import { Controller, Get } from '@nestjs/common';

@Controller()
export class LivenessController {
  @Get('healthz')
  liveness() {
    return { status: 'ok' };
  }
}
