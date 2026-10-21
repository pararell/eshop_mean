import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AiController } from './ai.controller';
import { AI_CONFIG, AiService } from './ai.service';
import { AiConfig, readAiConfig } from './ai.config';
import { LLM_PROVIDER, LlmProvider } from './providers/llm-provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

/** AI-assisted product entry (docs/ai.md). Disabled, with a 404 endpoint, when no API key is set. */
@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [
    { provide: AI_CONFIG, useFactory: () => readAiConfig() },
    {
      provide: LLM_PROVIDER,
      inject: [AI_CONFIG],
      useFactory: (config: AiConfig): LlmProvider | null => {
        if (!config.enabled) return null;
        switch (config.provider) {
          case 'deepseek':
            return new DeepSeekProvider(config.model, config.apiKey, config.baseUrl);
          case 'anthropic':
            return new AnthropicProvider(config.model, config.apiKey, config.baseUrl);
          case 'gemini':
            return new GeminiProvider(config.model, config.apiKey, config.baseUrl);
        }
      },
    },
    AiService,
  ],
})
export class AiModule {}
