import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LlmModule } from '../llm/llm.module';
import { QueueModule } from '../queue/queue.module';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { SummaryWorkerService } from './summary-worker.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SampleCandidate,
      CandidateDocument,
      CandidateSummary,
    ]),
    QueueModule,
    LlmModule,
  ],
  controllers: [CandidatesController],
  providers: [CandidatesService, SummaryWorkerService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
