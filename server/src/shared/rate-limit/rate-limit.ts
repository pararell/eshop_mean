import { applyDecorators, UseGuards } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/**
 * Per-IP limit on endpoints that send email, charge cards or check passwords (audit SEC-06).
 * `RATE_LIMIT_PER_MINUTE` (default 10) applies per endpoint and client IP; behind a reverse proxy
 * set `TRUST_PROXY` so the real client IP is used. In-memory, which fits the single-process server.
 */
export const RateLimitModule = ThrottlerModule.forRootAsync({
  useFactory: () => ({
    throttlers: [{ name: 'default', ttl: 60_000, limit: Number(process.env.RATE_LIMIT_PER_MINUTE) || 10 }],
    errorMessage: 'Too many requests. Please wait a minute and try again.',
  }),
});

/** Marks an endpoint as rate limited (see RateLimitModule) */
export const RateLimited = () => applyDecorators(UseGuards(ThrottlerGuard));
