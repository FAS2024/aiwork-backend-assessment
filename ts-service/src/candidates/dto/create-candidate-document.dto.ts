import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export const DOCUMENT_TYPES = ['resume', 'cover_letter', 'other'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class CreateCandidateDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  @IsIn(DOCUMENT_TYPES)
  documentType!: DocumentType;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  fileName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  storageKey!: string;

  @IsString()
  rawText!: string;
}
