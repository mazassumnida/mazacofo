import './sentry';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = process.env.PORT;
  await app.listen(port);

  console.log(`Server has started on port ${port}`);
}

bootstrap();
