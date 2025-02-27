import { Injectable } from '@nestjs/common';

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
  stackError(errorOptions: CreateError) {
    errorOptions.stacktrace = errorOptions.stacktrace || new Error().stack;
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
