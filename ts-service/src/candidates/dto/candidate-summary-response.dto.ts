import { RecommendedDecision } from '../../llm/summarization-provider.interface';

export type SummaryStatus = 'pending' | 'completed' | 'failed';

export class CandidateSummaryResponseDto {
  id!: string;
  candidateId!: string;
  status!: SummaryStatus;
  score!: number | null;
  strengths!: string[];
  concerns!: string[];
  summary!: string | null;
  recommendedDecision!: RecommendedDecision | null;
  provider!: string | null;
  promptVersion!: string | null;
  errorMessage!: string | null;
  createdAt!: string;
  updatedAt!: string;
}
