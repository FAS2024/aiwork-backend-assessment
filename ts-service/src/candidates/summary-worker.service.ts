import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { QueueService } from '../queue/queue.service';
import { SUMMARIZATION_PROVIDER } from '../llm/summarization-provider.interface';
import { SummarizationProvider } from '../llm/summarization-provider.interface';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary, SummaryStatus } from '../entities/candidate-summary.entity';

const JOB_NAME = 'generate-candidate-summary';

export interface GenerateSummaryJobPayload {
  summaryId: string;
  candidateId: string;
}

@Injectable()
export class SummaryWorkerService implements OnModuleInit, OnModuleDestroy {
  private processing = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly queueService: QueueService,
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
  ) {}

  onModuleInit(): void {
    this.queueService.registerHandler(
      JOB_NAME,
      this.handleGenerateSummaryJob.bind(this),
    );
    this.intervalId = setInterval(() => this.tick(), 500);
    (this.intervalId as NodeJS.Timeout).unref();
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  enqueueGenerateSummary(summaryId: string, candidateId: string): void {
    this.queueService.enqueue<GenerateSummaryJobPayload>(JOB_NAME, {
      summaryId,
      candidateId,
    });
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.queueService.processNext();
    } finally {
      this.processing = false;
    }
  }

  private async handleGenerateSummaryJob(
    job: { payload: GenerateSummaryJobPayload },
  ): Promise<void> {
    const { summaryId, candidateId } = job.payload;

    const summary = await this.summaryRepository.findOne({
      where: { id: summaryId, candidateId },
    });
    if (!summary || summary.status !== 'pending') {
      return;
    }

    const documents = await this.documentRepository.find({
      where: { candidateId },
      order: { uploadedAt: 'ASC' },
    });
    const documentTexts = documents.map((d) => d.rawText).filter(Boolean);

    try {
      const result = await this.summarizationProvider.generateCandidateSummary({
        candidateId,
        documents: documentTexts,
      });

      summary.status = 'completed' as SummaryStatus;
      summary.score = result.score;
      summary.strengths = result.strengths;
      summary.concerns = result.concerns;
      summary.summary = result.summary;
      summary.recommendedDecision = result.recommendedDecision;
      summary.provider = 'gemini';
      summary.promptVersion = '1.0';
      summary.errorMessage = null;
      await this.summaryRepository.save(summary);
    } catch (err) {
      summary.status = 'failed' as SummaryStatus;
      summary.errorMessage =
        err instanceof Error ? err.message : String(err);
      await this.summaryRepository.save(summary);
    }
  }
}
