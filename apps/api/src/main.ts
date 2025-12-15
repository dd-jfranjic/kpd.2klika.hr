/**
 * KPD 2klika API - Fresh Start
 * Version: 2.0
 * Date: 2025-12-13
 *
 * PHASE 1 - Minimal working API
 * Custom logging, filters, interceptors will be added in later phases
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // SECURITY: Enhanced security headers
  app.use(
    helmet({
      // Content Security Policy - sprječava XSS napade
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", 'https://js.stripe.com'],
          frameSrc: ['https://js.stripe.com', 'https://hooks.stripe.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'https://api.stripe.com'],
          objectSrc: ["'none'"], // Sprječava plugin content
          baseUri: ["'self'"], // Sprječava base tag injection
          formAction: ["'self'"], // Sprječava form submission na druge domene
        },
      },
      // HTTP Strict Transport Security - forsira HTTPS
      strictTransportSecurity: {
        maxAge: 31536000, // 1 godina
        includeSubDomains: true,
        preload: true,
      },
      // X-Frame-Options - sprječava clickjacking
      frameguard: { action: 'deny' },
      // Referrer Policy - kontrolira referrer informacije
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      // X-Content-Type-Options - sprječava MIME sniffing
      noSniff: true,
      // X-XSS-Protection - dodatna XSS zaštita (legacy)
      xssFilter: true,
      // Hide X-Powered-By header
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false, // Allow embedding for Stripe
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS - Allow web app and admin app
  const allowedOrigins = [
    process.env.APP_URL || 'http://localhost:13620',
    process.env.ADMIN_URL || 'http://localhost:13624',
    'https://kpd.2klika.hr',
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes - validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Swagger Documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KPD 2KLIKA API')
      .setDescription('AI-powered KPD Classification API - Multi-tenant SaaS')
      .setVersion('2.0')
      .addBearerAuth()
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag('classify', 'KPD Classification endpoints')
      .addTag('kpd', 'KPD Codes management')
      .addTag('organizations', 'Organization management')
      .addTag('subscriptions', 'Subscription & billing')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 13621;
  await app.listen(port);

  logger.log(`KPD API running on port ${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs: http://localhost:${port}/docs`);
  }
}

bootstrap();
