import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationsController } from './translations.controller';
import { Translation } from '../entities/translation.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Translation]),
    AuthModule,
    HttpModule,
  ],
  controllers: [TranslationsController],
  providers: [],
  exports: [TypeOrmModule],
})
export class TranslationsModule {}