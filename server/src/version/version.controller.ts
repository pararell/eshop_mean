import { Controller, Get } from '@nestjs/common';
import type { BuildInfo } from '@eshop/shared';

import { buildInfo } from './build-info';

@Controller('api')
export class VersionController {
  /** Which build is running (e.g. to check a deploy with curl); public, nothing else exposed */
  @Get('/version')
  version(): BuildInfo {
    return buildInfo;
  }
}
