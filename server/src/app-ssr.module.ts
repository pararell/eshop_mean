import { Module } from '@nestjs/common';
import { AngularUniversalModule } from './app-universal.module';
import { AppModule } from './app.module';

@Module({
  imports: [
    AppModule,
    AngularUniversalModule,
  ],
})
export class AppSSRModule {}
