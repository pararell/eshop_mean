import { Module } from '@nestjs/common';

import { OverviewController } from './overview.controller';
import { OverviewService } from './overview.service';

@Module({ controllers: [OverviewController], providers: [OverviewService] })
export class OverviewModule {}
