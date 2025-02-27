import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HttpModule } from '@nestjs/axios';
import { ErrorHandlingModule } from './error-handling/error-handling.module';
import { CloudflareModule } from './cloudflare/cloudflare.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      load: [configuration],
      cache: true,
      isGlobal: true,
    }),
    ErrorHandlingModule,
    CloudflareModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
