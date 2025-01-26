import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlingService } from './error-handling.service';

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlingService],
    }).compile();

    service = module.get<ErrorHandlingService>(ErrorHandlingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
