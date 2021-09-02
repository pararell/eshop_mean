import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { setAppDB } from './setAppDB';

async function bootstrap() {
  const logger = new Logger('boostrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  setAppDB(app);

  const port = process.env.PORT;
  await app.listen(port);
  logger.log('App listening on port ' + port);
}

bootstrap();
