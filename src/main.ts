import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Configure CORS origins from environment variables
  const corsOrigins = configService.get<string>("CORS_ALLOWED_ORIGINS")?.split(",") || [
    "http://localhost:3000",
    "http://localhost:3002",
  ];

  // Enable CORS for frontend integration
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // API prefix
  app.setGlobalPrefix("api/v1");

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Penpal AI Monitoring Service")
    .setDescription(
      "Service de monitoring et métriques pour l'écosystème Penpal AI"
    )
    .setVersion("1.0")
    .addTag("monitoring")
    .addTag("metrics")
    .addTag("health")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3005;
  await app.listen(port);

  console.log(
    `🚀 Penpal AI Monitoring Service is running on: http://localhost:${port}`
  );
  console.log(`📊 Metrics available at: http://localhost:${port}/metrics`);
  console.log(`📋 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
