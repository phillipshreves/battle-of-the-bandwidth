import { Controller, Get, Post, Body, Patch, Param, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { CloudflareService } from './cloudflare.service';
import { RunSpeedTestDto } from './dto/run-speed-test.dto';

@Controller('cloudflare')
export class CloudflareController {
  constructor(private readonly cloudflareService: CloudflareService) {}

  @Post('speed-test')
  async runSpeedTest() {
    try {
      return await this.cloudflareService.runSpeedTest();
    } catch (error) {
      throw new HttpException({ statusCode: HttpStatus.CONFLICT, statusMessage: error.status }, HttpStatus.OK);
    }
  }
}
