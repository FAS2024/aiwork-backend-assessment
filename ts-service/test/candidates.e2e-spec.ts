import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Candidates API (e2e)', () => {
  let app: INestApplication;
  const authHeaders = {
    'x-user-id': 'e2e-user',
    'x-workspace-id': 'e2e-workspace',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('full flow: create candidate, add document, request summary, list and get summary', async () => {
    const createCandidateRes = await request(app.getHttpServer())
      .post('/sample/candidates')
      .set(authHeaders)
      .send({ fullName: 'E2E Candidate', email: 'e2e@test.com' })
      .expect(HttpStatus.CREATED);

    const candidateId = createCandidateRes.body.id;
    expect(candidateId).toBeDefined();

    const createDocRes = await request(app.getHttpServer())
      .post(`/candidates/${candidateId}/documents`)
      .set(authHeaders)
      .send({
        documentType: 'resume',
        fileName: 'resume.txt',
        storageKey: '/uploads/e2e/resume.txt',
        rawText: 'Senior engineer with 10 years experience.',
      })
      .expect(HttpStatus.CREATED);

    expect(createDocRes.body.candidateId).toBe(candidateId);
    expect(createDocRes.body.documentType).toBe('resume');

    const generateRes = await request(app.getHttpServer())
      .post(`/candidates/${candidateId}/summaries/generate`)
      .set(authHeaders)
      .expect(HttpStatus.ACCEPTED);

    expect(generateRes.body.status).toBe('pending');
    expect(generateRes.body.candidateId).toBe(candidateId);
    const summaryId = generateRes.body.id;

    const listRes = await request(app.getHttpServer())
      .get(`/candidates/${candidateId}/summaries`)
      .set(authHeaders)
      .expect(HttpStatus.OK);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
    const found = listRes.body.find((s: { id: string }) => s.id === summaryId);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');

    const getOneRes = await request(app.getHttpServer())
      .get(`/candidates/${candidateId}/summaries/${summaryId}`)
      .set(authHeaders)
      .expect(HttpStatus.OK);

    expect(getOneRes.body.id).toBe(summaryId);
    expect(getOneRes.body.candidateId).toBe(candidateId);
    expect(getOneRes.body.status).toBe('pending');
  });

  it('returns 401 without auth headers', async () => {
    await request(app.getHttpServer())
      .get('/candidates/some-id/summaries')
      .expect(HttpStatus.UNAUTHORIZED);
  });
});
