import {
  Controller,
  Get,
} from '@nestjs/common';

@Controller()
export class AppController {
  //health check
  @Get('health-check')
  async healthCheck() {
    return {
      message: 'Service is up and running',
      status: 'Healthy',
    };
  }
}
