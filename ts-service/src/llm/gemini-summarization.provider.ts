import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  RecommendedDecision,
  SummarizationProvider,
} from './summarization-provider.interface';

const PROMPT_VERSION = '1.0';
const MODEL = 'gemini-1.5-flash';

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  constructor(private readonly configService: ConfigService) {}

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey?.trim()) {
      throw new Error(
        'GEMINI_API_KEY is not set. Set it in .env to use the real summarization provider.',
      );
    }

    const combinedText = input.documents.join('\n\n---\n\n');
    const prompt = `You are a recruiter assistant. Analyze the following candidate document(s) and produce a structured summary.

Candidate ID: ${input.candidateId}

Documents:
${combinedText.slice(0, 28000)}

Respond with a single JSON object (no markdown) with exactly these keys:
- "score": number 0-100 (overall fit)
- "strengths": array of strings (2-5 items)
- "concerns": array of strings (0-5 items)
- "summary": string (2-4 sentences)
- "recommendedDecision": one of "advance" | "hold" | "reject"`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errBody}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      throw new Error('Gemini returned empty or unexpected response');
    }

    return this.parseAndValidate(text);
  }

  private parseAndValidate(text: string): CandidateSummaryResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Gemini response was not valid JSON');
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Gemini response was not a JSON object');
    }

    const obj = parsed as Record<string, unknown>;
    const score = this.numberInRange(obj.score, 0, 100, 50);
    const strengths = this.stringArray(obj.strengths);
    const concerns = this.stringArray(obj.concerns);
    const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
    const recommendedDecision = this.validDecision(obj.recommendedDecision);

    return {
      score,
      strengths,
      concerns,
      summary: summary || 'No summary produced.',
      recommendedDecision,
    };
  }

  private numberInRange(
    value: unknown,
    min: number,
    max: number,
    fallback: number,
  ): number {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  private stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((x): x is string => typeof x === 'string')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private validDecision(value: unknown): RecommendedDecision {
    if (value === 'advance' || value === 'hold' || value === 'reject') {
      return value;
    }
    return 'hold';
  }
}
