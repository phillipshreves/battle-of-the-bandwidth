import { Test, TestingModule } from '@nestjs/testing';
import { CloudflareService } from './cloudflare.service';

describe('CloudflareService', () => {
  let service: CloudflareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudflareService],
    }).compile();

    service = module.get<CloudflareService>(CloudflareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
