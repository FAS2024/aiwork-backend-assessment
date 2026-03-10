import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthUser } from '../auth/auth.types';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SUMMARIZATION_PROVIDER } from '../llm/summarization-provider.interface';
import { CandidatesService } from './candidates.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let candidateRepo: Repository<SampleCandidate>;
  let documentRepo: Repository<CandidateDocument>;
  let summaryRepo: Repository<CandidateSummary>;

  const mockUser: AuthUser = {
    userId: 'user-1',
    workspaceId: 'workspace-1',
  };

  const mockCandidate: SampleCandidate = {
    id: 'cand-1',
    workspaceId: 'workspace-1',
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    createdAt: new Date(),
  } as SampleCandidate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: {
            create: jest.fn((x) => ({ ...x })),
            save: jest.fn((x) => Promise.resolve({ ...x })),
          },
        },
        {
          provide: getRepositoryToken(CandidateSummary),
          useValue: {
            create: jest.fn((x) => ({ ...x })),
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn((x) => Promise.resolve({ ...x, createdAt: new Date(), updatedAt: new Date() })),
          },
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    candidateRepo = module.get(getRepositoryToken(SampleCandidate));
    documentRepo = module.get(getRepositoryToken(CandidateDocument));
    summaryRepo = module.get(getRepositoryToken(CandidateSummary));

    jest.mocked(candidateRepo.findOne).mockResolvedValue(mockCandidate);
  });

  it('createDocument creates and saves a document for workspace candidate', async () => {
    const dto = {
      documentType: 'resume' as const,
      fileName: 'resume.pdf',
      storageKey: '/uploads/cand-1/resume.pdf',
      rawText: 'Experience: 5 years backend.',
    };
    const result = await service.createDocument('cand-1', mockUser, dto);
    expect(result.candidateId).toBe('cand-1');
    expect(result.documentType).toBe('resume');
    expect(result.fileName).toBe('resume.pdf');
    expect(documentRepo.save).toHaveBeenCalled();
  });

  it('getCandidateForWorkspace throws when candidate not in workspace', async () => {
    jest.mocked(candidateRepo.findOne).mockResolvedValue(null);
    await expect(
      service.getCandidateForWorkspace('other', mockUser),
    ).rejects.toThrow('Candidate not found');
  });

  it('requestSummaryGeneration creates pending summary', async () => {
    const result = await service.requestSummaryGeneration('cand-1', mockUser);
    expect(result.status).toBe('pending');
    expect(result.candidateId).toBe('cand-1');
    expect(summaryRepo.save).toHaveBeenCalled();
  });
});
