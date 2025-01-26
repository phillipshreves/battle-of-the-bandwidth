import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      crossOriginOpenerPolicy: false,
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https: data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'unsafe-inline'"],
          styleSrcElem: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );

  app.use(cookieParser());

  const configService = app.get(ConfigService);

  if (configService.get('devCORSenabled') === 'true') {
    app.enableCors({
      origin: [
        'http://192.168.64.2:3002',
        'http://192.168.64.2:3000',
        'http://192.168.64.2:3003',
      ],
      credentials: true,
    });
  }

  if (configService.get('prodCORSenabled') === 'true') {
    app.enableCors({
      origin: [
        'https://internal-portal-frontend-web-next.vercel.app',
        'https://internal.highpointgo.com',
        'https://developer-portal-frontend-web-next.vercel.app',
      ],
      credentials: true,
    });
  }

  const port = process.env.PORT || 3000;

  const swaggerConfig = new DocumentBuilder()
    .addServer(configService.get('openapi.server.address'))
    .setTitle('Authenticator Service API')
    .setDescription(
      'Developer documentation for High Point Authentication Service.',
    )
    .addTag('token')
    .addTag('user')

    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      description:
        'First call the login endpoint, then add the JWT from sign-in response into this input',
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(port);
}
bootstrap();
