import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, count, eq, gte, like, or, sum } from 'drizzle-orm';
import type { AiDraftRequest, AiDraftResponse, AiStatus } from '@eshop/shared';

import { Database, DRIZZLE } from '../db/database.module';
import { aiUsage, categories, products } from '../db/schema';
import { languages } from '../shared/constans';
import { AiConfig, estimateCostUsd } from './ai.config';
import { fetchImage, ImageInputError, resizedImageUrl } from './ai-images';
import { buildDraftSchema, buildSystemPrompt, buildUserPrompt } from './draft-schema';
import { mapDraft, MappedDraft } from './draft-mapper';
import { LLM_PROVIDER, LlmError, LlmProvider, LlmResponse, LlmUsage } from './providers/llm-provider';

export const AI_CONFIG = Symbol('AI_CONFIG');

/** One retry when the model's answer is not valid; other failures are not retried */
const MAX_ATTEMPTS = 2;

const startOfUtcDay = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const startOfUtcMonth = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

@Injectable()
export class AiService {
  private readonly logger = new Logger('AiService');
  /** Admins with a request in progress (one at a time per admin) */
  private readonly inFlight = new Set<string>();

  constructor(
    @Inject(DRIZZLE) private db: Database,
    @Inject(AI_CONFIG) private config: AiConfig,
    @Inject(LLM_PROVIDER) private provider: LlmProvider | null,
  ) {
    if (!provider) {
      this.logger.log(`AI product drafts are disabled: ${config.disabledReason ?? 'no provider'}`);
    }
  }

  status(): AiStatus {
    return this.provider ? { enabled: true, provider: this.provider.name, model: this.provider.model } : { enabled: false };
  }

  async createDraft(userId: string, request: AiDraftRequest): Promise<AiDraftResponse> {
    const provider = this.provider;
    if (!provider) {
      throw new NotFoundException('AI product drafts are not enabled on this shop.');
    }

    const imageUrls = (request.imageUrls ?? []).slice(0, this.config.maxImages);
    const text = request.text?.trim();
    const supplierText = request.supplierText?.trim();
    if (!imageUrls.length && !text && !supplierText) {
      throw new UnprocessableEntityException('Add at least one photo or a few words about the product.');
    }

    if (this.inFlight.has(userId)) {
      throw new HttpException('An AI draft is already being created. Wait for it to finish.', HttpStatus.TOO_MANY_REQUESTS);
    }
    this.inFlight.add(userId);
    try {
      await this.checkLimits(userId);
      const images = await this.loadImages(imageUrls);
      const categoryNames = (await this.db.select({ titleUrl: categories.titleUrl }).from(categories)).map((c) => c.titleUrl).sort();

      const llmRequest = {
        system: buildSystemPrompt(languages, categoryNames),
        prompt: buildUserPrompt({ text, supplierText, imageCount: images.length }),
        images,
        schema: buildDraftSchema(languages, categoryNames),
        timeoutMs: this.config.timeoutMs,
      };

      const total = { inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 };
      for (let attempt = 1; ; attempt++) {
        const started = Date.now();
        let response: LlmResponse | undefined;
        let mapped: MappedDraft;
        try {
          response = await provider.generate(llmRequest);
          mapped = mapDraft(response.json, { languages, categories: categoryNames, imageUrls });
        } catch (error) {
          const llmError = error instanceof LlmError ? error : new LlmError('upstream', (error as Error).message);
          const usage = response?.usage ?? llmError.usage ?? { inputTokens: 0, outputTokens: 0 };
          const status = llmError.kind === 'invalid_output' ? 'invalid_output' : llmError.kind === 'timeout' ? 'timeout' : 'error';
          const cost = await this.logUsage(userId, provider, images.length, usage, Date.now() - started, status, llmError.kind);
          this.add(total, usage, cost, Date.now() - started);
          this.logger.warn(`AI draft attempt ${attempt} failed (${llmError.kind}): ${llmError.message}`);
          if (llmError.kind === 'invalid_output' && attempt < MAX_ATTEMPTS) continue;
          throw this.toHttpError(llmError);
        }

        const cost = await this.logUsage(userId, provider, images.length, response.usage, Date.now() - started, 'ok');
        this.add(total, response.usage, cost, Date.now() - started);
        mapped.draft.titleUrl = await this.uniqueTitleUrl(mapped.draft.titleUrl);
        mapped.draft.mainImage.name = mapped.draft.titleUrl;
        return { ...mapped, usage: { provider: provider.name, model: provider.model, ...total } };
      }
    } finally {
      this.inFlight.delete(userId);
    }
  }

  private add(total: { inputTokens: number; outputTokens: number; costUsd: number; durationMs: number }, usage: LlmUsage, cost: number, ms: number) {
    total.inputTokens += usage.inputTokens;
    total.outputTokens += usage.outputTokens;
    total.costUsd = Math.round((total.costUsd + cost) * 1e6) / 1e6;
    total.durationMs += ms;
  }

  /** Per-admin hourly limit, shop-wide daily limit and monthly cost cap (all from ai_usage) */
  private async checkLimits(userId: string): Promise<void> {
    const now = new Date();
    const [{ perHour }] = await this.db
      .select({ perHour: count() })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, new Date(now.getTime() - 3_600_000))));
    if (perHour >= this.config.ratePerHour) {
      throw new HttpException(`AI limit reached: ${this.config.ratePerHour} drafts per hour. Try again later.`, HttpStatus.TOO_MANY_REQUESTS);
    }

    const [{ today }] = await this.db
      .select({ today: count() })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, startOfUtcDay(now)));
    if (today >= this.config.dailyLimit) {
      throw new ServiceUnavailableException(`The shop's daily AI limit (${this.config.dailyLimit} drafts) is reached. It resets at midnight UTC.`);
    }

    const [{ spent }] = await this.db
      .select({ spent: sum(aiUsage.costUsd).mapWith(Number) })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, startOfUtcMonth(now)));
    if ((spent ?? 0) >= this.config.monthlyBudgetUsd) {
      throw new ServiceUnavailableException(
        `The shop's monthly AI budget (${this.config.monthlyBudgetUsd} USD estimated) is used up. It resets on the 1st (UTC).`,
      );
    }
  }

  private async loadImages(imageUrls: string[]) {
    try {
      const resized = imageUrls.map((url) => resizedImageUrl(url, this.config));
      return await Promise.all(resized.map((url) => fetchImage(url, this.config.maxImageBytes)));
    } catch (error) {
      if (error instanceof ImageInputError) throw new UnprocessableEntityException(error.message);
      throw error;
    }
  }

  private async logUsage(
    userId: string,
    provider: LlmProvider,
    imageCount: number,
    usage: LlmUsage,
    durationMs: number,
    status: 'ok' | 'invalid_output' | 'error' | 'timeout',
    errorCode?: string,
  ): Promise<number> {
    const costUsd = estimateCostUsd(usage, this.config.price);
    try {
      await this.db.insert(aiUsage).values({
        userId,
        provider: provider.name,
        model: provider.model,
        imageCount,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        costUsd,
        durationMs,
        status,
        errorCode: errorCode ?? null,
      });
    } catch (error) {
      // Usage logging must not break the admin's request
      this.logger.error(`Could not log AI usage: ${(error as Error).message}`);
    }
    this.logger.log(
      `AI draft ${status}: ${provider.name}/${provider.model}, ${usage.inputTokens} in + ${usage.outputTokens} out tokens, ~${costUsd} USD, ${durationMs} ms`,
    );
    return costUsd;
  }

  /** Adds -2, -3, … when a product with the slug exists */
  private async uniqueTitleUrl(base: string): Promise<string> {
    const taken = new Set(
      (
        await this.db
          .select({ titleUrl: products.titleUrl })
          .from(products)
          .where(or(eq(products.titleUrl, base), like(products.titleUrl, `${base.replace(/[\\%_]/g, '\\$&')}-%`)))
      ).map((p) => p.titleUrl),
    );
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
    }
  }

  private toHttpError(error: LlmError): HttpException {
    switch (error.kind) {
      case 'timeout':
        return new GatewayTimeoutException('The AI took too long to answer. Try again, perhaps with fewer photos.');
      case 'unavailable':
        return new ServiceUnavailableException('The AI provider is busy or its quota is used up. Try again in a minute.');
      case 'auth':
        return new BadGatewayException('The AI provider rejected the API key. Check the server configuration.');
      case 'refused':
        return new UnprocessableEntityException('The AI declined to describe this input. Try other photos or wording.');
      case 'invalid_output':
        return new BadGatewayException('The AI returned an unusable answer twice. Try again.');
      default:
        return new BadGatewayException('The AI provider failed. Try again later.');
    }
  }
}
