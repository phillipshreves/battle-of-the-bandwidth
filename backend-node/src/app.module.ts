import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { TokenModule } from './token/token.module';
import { FilemakerModule } from './filemaker/filemaker.module';
import { LoggerModule } from './logger/logger.module';
import { OneTimePasswordModule } from './one-time-password/one-time-password.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './security/guard/local.strategy';
import { UserService } from './user/user.service';
import * as Joi from 'joi';
import configuration from './config/configuration';
import { HttpModule } from '@nestjs/axios';
import { ErrorHandlingModule } from './error-handling/error-handling.module';
import { MessageModule } from './message/message.module';
import { RolesModule } from './roles/roles.module';
import { RedisHelperModule } from '@app/redis-helper';

@Module({
  imports: [
    TokenModule,
    PassportModule,
    FilemakerModule,
    LoggerModule,
    OneTimePasswordModule,
    UserModule,
    HttpModule,
    MessageModule,
    RedisHelperModule,
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 20,
    }),
    ConfigModule.forRoot({
      load: [configuration],
      cache: true,
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        JWT_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        FMS_URL: Joi.string().required(),
        FMS_ODATA_USER_AUTH_ONLY: Joi.string().required(),
        SMTP_USER: Joi.string(),
        SMTP_PASS: Joi.string(),
      }),
    }),
    ErrorHandlingModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserService, LocalStrategy],
})
export class AppModule {}
