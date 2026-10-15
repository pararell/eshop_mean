import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TranslationsController } from './translations.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, HttpModule],
  controllers: [TranslationsController],
  providers: [],
})
export class TranslationsModule {}
