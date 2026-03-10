import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { AuthUser } from '../auth/auth.types';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary, SummaryStatus } from '../entities/candidate-summary.entity';
import { CreateCandidateDocumentDto } from './dto/create-candidate-document.dto';
import { CandidateSummaryResponseDto } from './dto/candidate-summary-response.dto';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(SampleCandidate)
    private readonly candidateRepository: Repository<SampleCandidate>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
  ) {}

  /** Ensure candidate exists and belongs to the user's workspace. */
  async getCandidateForWorkspace(
    candidateId: string,
    user: AuthUser,
  ): Promise<SampleCandidate> {
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId, workspaceId: user.workspaceId },
    });
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return candidate;
  }

  async createDocument(
    candidateId: string,
    user: AuthUser,
    dto: CreateCandidateDocumentDto,
  ): Promise<CandidateDocument> {
    await this.getCandidateForWorkspace(candidateId, user);

    const doc = this.documentRepository.create({
      id: randomUUID(),
      candidateId,
      documentType: dto.documentType,
      fileName: dto.fileName.trim(),
      storageKey: dto.storageKey.trim(),
      rawText: dto.rawText,
    });
    return this.documentRepository.save(doc);
  }

  async requestSummaryGeneration(
    candidateId: string,
    user: AuthUser,
  ): Promise<CandidateSummaryResponseDto> {
    await this.getCandidateForWorkspace(candidateId, user);

    const summary = this.summaryRepository.create({
      id: randomUUID(),
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
    });
    const saved = await this.summaryRepository.save(summary);
    return this.toSummaryDto(saved);
  }

  async listSummaries(
    candidateId: string,
    user: AuthUser,
  ): Promise<CandidateSummaryResponseDto[]> {
    await this.getCandidateForWorkspace(candidateId, user);

    const summaries = await this.summaryRepository.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });
    return summaries.map((s) => this.toSummaryDto(s));
  }

  async getSummary(
    candidateId: string,
    summaryId: string,
    user: AuthUser,
  ): Promise<CandidateSummaryResponseDto> {
    await this.getCandidateForWorkspace(candidateId, user);

    const summary = await this.summaryRepository.findOne({
      where: { id: summaryId, candidateId },
    });
    if (!summary) {
      throw new NotFoundException('Summary not found');
    }
    return this.toSummaryDto(summary);
  }

  toSummaryDto(s: CandidateSummary): CandidateSummaryResponseDto {
    return {
      id: s.id,
      candidateId: s.candidateId,
      status: s.status,
      score: s.score,
      strengths: s.strengths ?? [],
      concerns: s.concerns ?? [],
      summary: s.summary,
      recommendedDecision: s.recommendedDecision,
      provider: s.provider,
      promptVersion: s.promptVersion,
      errorMessage: s.errorMessage,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
