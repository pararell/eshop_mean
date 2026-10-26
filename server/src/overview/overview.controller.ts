import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AdminOverview } from '@eshop/shared';

import { RolesGuard } from '../auth/roles.guard';
import { OVERVIEW_DAYS, OverviewService } from './overview.service';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OverviewController {
  constructor(private overviewService: OverviewService) {}

  /** Admin Overview figures for today (1), 7 or 30 days; anything else means 7 */
  @Get('/overview')
  overview(@Query('days') days?: string): Promise<AdminOverview> {
    const value = Number(days);
    return this.overviewService.overview((OVERVIEW_DAYS as readonly number[]).includes(value) ? value : 7);
  }
}
