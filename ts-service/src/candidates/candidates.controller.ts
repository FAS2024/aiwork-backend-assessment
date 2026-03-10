import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/auth-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { CreateCandidateDocumentDto } from './dto/create-candidate-document.dto';
import { CandidateSummaryResponseDto } from './dto/candidate-summary-response.dto';
import { CandidatesService } from './candidates.service';
import { SummaryWorkerService } from './summary-worker.service';

@Controller('candidates')
@UseGuards(FakeAuthGuard)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly summaryWorkerService: SummaryWorkerService,
  ) {}

  @Post(':candidateId/documents')
  async createDocument(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: CreateCandidateDocumentDto,
  ) {
    const doc = await this.candidatesService.createDocument(
      candidateId,
      user,
      dto,
    );
    return {
      id: doc.id,
      candidateId: doc.candidateId,
      documentType: doc.documentType,
      fileName: doc.fileName,
      storageKey: doc.storageKey,
      uploadedAt: doc.uploadedAt.toISOString(),
    };
  }

  @Post(':candidateId/summaries/generate')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ): Promise<CandidateSummaryResponseDto> {
    const summary = await this.candidatesService.requestSummaryGeneration(
      candidateId,
      user,
    );
    this.summaryWorkerService.enqueueGenerateSummary(summary.id, candidateId);
    return summary;
  }

  @Get(':candidateId/summaries')
  async listSummaries(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ): Promise<CandidateSummaryResponseDto[]> {
    return this.candidatesService.listSummaries(candidateId, user);
  }

  @Get(':candidateId/summaries/:summaryId')
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Param('summaryId') summaryId: string,
  ): Promise<CandidateSummaryResponseDto> {
    return this.candidatesService.getSummary(
      candidateId,
      summaryId,
      user,
    );
  }
}
