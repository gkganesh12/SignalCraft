import 'reflect-metadata';
import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import express from 'express';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableShutdownHooks();

  app.use('/webhooks/clerk', express.raw({ type: '*/*' }));
  app.use('/webhooks/sentry', express.raw({ type: '*/*' }));
  app.use('/webhooks/slack/actions', express.raw({ type: '*/*' }));

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = process.env.CORS_ORIGINS?.split(',').map((item) => item.trim());
      if (!origin || !allowed?.length || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS blocked'), false);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('SignalCraft API')
    .setDescription('SignalCraft backend API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
}

bootstrap();
