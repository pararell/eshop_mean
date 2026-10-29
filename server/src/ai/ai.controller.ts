import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AiDraftResponse, AiStatus, AiThemeDraftResponse } from '@eshop/shared';

import { RolesGuard } from '../auth/roles.guard';
import { GetUser } from '../auth/utils/get-user.decorator';
import { User } from '../auth/models/user.model';
import { AiService } from './ai.service';
import { AiDraftRequestDto, AiThemeDraftRequestDto } from './dto/ai-draft.dto';

@Controller('api/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  /** Whether "Fill with AI" is available (the admin form hides it otherwise) */
  @Get('/ai/status')
  status(): AiStatus {
    return this.aiService.status();
  }

  /** Creates a product draft from photos and/or text. Nothing is saved except a usage log row. */
  @Post('/products/ai-draft')
  @HttpCode(HttpStatus.OK)
  createDraft(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }))
    body: AiDraftRequestDto,
    @GetUser() user: User,
    @Headers('lang') lang?: string,
  ): Promise<AiDraftResponse> {
    return this.aiService.createDraft(user._id, body, lang);
  }

  /** Proposes a theme look and home band texts from a short brief. Nothing is saved except a usage log row. */
  @Post('/themes/ai-draft')
  @HttpCode(HttpStatus.OK)
  createThemeDraft(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }))
    body: AiThemeDraftRequestDto,
    @GetUser() user: User,
    @Headers('lang') lang?: string,
  ): Promise<AiThemeDraftResponse> {
    return this.aiService.createThemeDraft(user._id, body.brief, lang);
  }
}
