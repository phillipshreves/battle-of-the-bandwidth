import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';

export interface CreateError {
  code: number;
  data?: object;
  location?: string;
  message: string;
  stacktrace?: string;
}

export interface GenericResult<T> {
  data: T;
  error: CreateError;
}

@Injectable()
export class ErrorHandlingService {
  constructor(private loggerService: LoggerService) {}

  stackError(errorOptions: CreateError) {
    errorOptions.stacktrace = errorOptions.stacktrace || new Error().stack;

    this.loggerService.logger.error(errorOptions);
    this.loggerService.simpleLogger.error(errorOptions.stacktrace);
    return errorOptions;
  }

  createResult() {
    const result: GenericResult<any> = {
      data: {},
      error: { code: 0, message: '' },
    };
    return result;
  }
}
