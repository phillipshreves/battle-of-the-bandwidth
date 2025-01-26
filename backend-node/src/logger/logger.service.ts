import { Injectable } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class LoggerService {
  constructor(private configService: ConfigService) {}

  loggerConsoleLevel = this.configService.get('logger.transport.console.level');
  isSilentConsole = this.configService.get('logger.transport.console.isSilent');
  isSilentConsoleBoolean = this.isSilentConsole === 'true';
  loggerFileLevel = this.configService.get('logger.transport.file.level');
  isSilentFile = this.configService.get('logger.transport.file.isSilent');
  isSilentFileBoolean = this.isSilentFile === 'true';

  logger = winston.createLogger({
    transports: [
      //Winston as console log
      new winston.transports.Console({
        level: this.loggerConsoleLevel,
        silent: this.isSilentConsoleBoolean,
        format: winston.format.simple(),
        // format: winston.format.combine(
        // winston.format.timestamp(),
        // winston.format.ms(),
        // winston.format.json({ space: 1 }),
        // winston.format.colorize({
        //   all: true,
        //   colors: { debug: 'magenta', info: 'blue', error: 'red' },
        // }),
        // ),
      }),
      //Rotating File logger
      new winston.transports.DailyRotateFile({
        level: this.loggerFileLevel,
        silent: this.isSilentFileBoolean,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json({ space: 1 }),
        ),
        filename: 'auth-app-error-%DATE%.log',
        dirname: './log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
      }),
    ],
  });

  // print stack traces on error
  simpleLogger = winston.createLogger({
    transports: [
      //Winston as console log
      new winston.transports.Console({
        level: 'error',
        silent: this.isSilentConsoleBoolean,
        format: winston.format.simple(),
      }),
    ],
  });

  httpRequestLogger(request: Request) {
    this.logger.http(`${request.method} ${request.url}`, {
      body: request.body,
    });
  }
}
