import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppSSRModule } from './app-ssr.module';
import { Logger } from '@nestjs/common';
import { setAppDB } from './setAppDB';
import { prepareDatabase } from './db/startup';

async function bootstrap() {
  const logger = new Logger('boostrap');

  // Log instead of crashing the process on a stray rejected promise
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason instanceof Error ? reason.stack : String(reason));
  });

  // Apply pending migrations before anything touches the database (automatic deploys)
  try {
    await prepareDatabase();
  } catch (error) {
    logger.error(`Database is not ready, exiting: ${(error as Error).message}`);
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppSSRModule);

  setAppDB(app);

  await app.listen(process.env.PORT!);
  logger.log('App listening on port ' + process.env.PORT);
}

bootstrap().catch((err) => console.error(err));
