import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { FakeSummarizationProvider } from './fake-summarization.provider';
import { GeminiSummarizationProvider } from './gemini-summarization.provider';
import { SUMMARIZATION_PROVIDER } from './summarization-provider.interface';

@Module({
  providers: [
    FakeSummarizationProvider,
    GeminiSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      useFactory: (
        config: ConfigService,
        fake: FakeSummarizationProvider,
        gemini: GeminiSummarizationProvider,
      ) => {
        const key = config.get<string>('GEMINI_API_KEY');
        return key?.trim() ? gemini : fake;
      },
      inject: [ConfigService, FakeSummarizationProvider, GeminiSummarizationProvider],
    },
  ],
  exports: [SUMMARIZATION_PROVIDER, FakeSummarizationProvider],
})
export class LlmModule {}
