import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { QueueService } from '../queue/queue.service';
import { SUMMARIZATION_PROVIDER } from '../llm/summarization-provider.interface';
import { SummarizationProvider } from '../llm/summarization-provider.interface';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary, SummaryStatus } from '../entities/candidate-summary.entity';
import { SummaryWorkerService } from './summary-worker.service';

describe('SummaryWorkerService', () => {
  let worker: SummaryWorkerService;
  let queueService: QueueService;
  let summaryRepo: { findOne: jest.Mock; save: jest.Mock };
  let documentRepo: { find: jest.Mock };
  let summarizationProvider: SummarizationProvider;

  const summaryId = 'summary-1';
  const candidateId = 'cand-1';

  beforeEach(async () => {
    summaryRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    documentRepo = {
      find: jest.fn().mockResolvedValue([{ rawText: 'Resume content' }]),
    };
    const mockProvider: SummarizationProvider = {
      generateCandidateSummary: jest.fn(),
    };
    summarizationProvider = mockProvider;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryWorkerService,
        QueueService,
        {
          provide: getRepositoryToken(CandidateSummary),
          useValue: summaryRepo,
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: documentRepo,
        },
        {
          provide: SUMMARIZATION_PROVIDER,
          useValue: mockProvider,
        },
      ],
    }).compile();

    worker = module.get<SummaryWorkerService>(SummaryWorkerService);
    queueService = module.get<QueueService>(QueueService);

    worker.onModuleInit();
  });

  it('updates summary to completed when provider succeeds', async () => {
    const pendingSummary = {
      id: summaryId,
      candidateId,
      status: 'pending' as SummaryStatus,
      score: null,
      strengths: [],
      concerns: [],
      summary: null,
      recommendedDecision: null,
      provider: null,
      promptVersion: null,
      errorMessage: null,
    };
    summaryRepo.findOne.mockResolvedValue(pendingSummary);
    jest.mocked(summarizationProvider.generateCandidateSummary).mockResolvedValue({
      score: 75,
      strengths: ['Strong backend'],
      concerns: ['Limited frontend'],
      summary: 'Solid candidate.',
      recommendedDecision: 'advance',
    });

    worker.enqueueGenerateSummary(summaryId, candidateId);
    await queueService.processNext();

    expect(summaryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'completed',
        score: 75,
        summary: 'Solid candidate.',
        recommendedDecision: 'advance',
        errorMessage: null,
      }),
    );
  });

  it('updates summary to failed when provider throws', async () => {
    const pendingSummary = {
      id: summaryId,
      candidateId,
      status: 'pending' as SummaryStatus,
    };
    summaryRepo.findOne.mockResolvedValue(pendingSummary);
    jest.mocked(summarizationProvider.generateCandidateSummary).mockRejectedValue(new Error('API error'));

    worker.enqueueGenerateSummary(summaryId, candidateId);
    await queueService.processNext();

    expect(summaryRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'API error',
      }),
    );
  });
});
