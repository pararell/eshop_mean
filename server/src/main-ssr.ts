import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppSSRModule } from './app-ssr.module';
import { Logger } from '@nestjs/common';
import { setAppDB } from './setAppDB';

async function bootstrap() {
  const logger = new Logger('boostrap');

  // Log instead of crashing the process on a stray rejected promise
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason instanceof Error ? reason.stack : String(reason));
  });

  const app = await NestFactory.create<NestExpressApplication>(AppSSRModule);

  setAppDB(app);

  await app.listen(process.env.PORT!);
  logger.log('App listening on port ' + process.env.PORT);
}

bootstrap().catch((err) => console.error(err));
