import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as path from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers. CSP is disabled so Swagger UI's CDN assets keep working
  // while every other helmet default (X-Content-Type-Options, Referrer-Policy,
  // frame/embedding guards, ...) stays on.
  app.use(helmet({ contentSecurityPolicy: false }));

  const config = app.get(ConfigService);
  // CORS: comma-separated allow-list from CORS_ORIGINS, e.g. "https://jabaib.com,https://admin.jabaib.com".
  // Unset in dev => reflect any origin (same behaviour as the previous bare enableCors()).
  const corsOrigins = config
    .get<string>('CORS_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
  });

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const uploadDir =
    app.get(ConfigService).get<string>('LOCAL_UPLOAD_DIR') ?? './uploads';
  const uploadRoot = path.isAbsolute(uploadDir)
    ? uploadDir
    : path.resolve(process.cwd(), uploadDir);
  app.useStaticAssets(uploadRoot, { index: false, fallthrough: true });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Jabaib Clothing Brand API')
    .setDescription(
      'Single-vendor ecommerce API — admin panel and customer storefront.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .addTag('Auth — Admin')
    .addTag('Auth — User')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
