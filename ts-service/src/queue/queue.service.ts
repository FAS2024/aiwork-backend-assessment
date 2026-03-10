import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';

export interface EnqueuedJob<TPayload = unknown> {
  id: string;
  name: string;
  payload: TPayload;
  enqueuedAt: string;
}

export type JobHandler<TPayload = unknown> = (job: EnqueuedJob<TPayload>) => Promise<void>;

@Injectable()
export class QueueService {
  private readonly jobs: EnqueuedJob[] = [];
  private readonly handlers = new Map<string, JobHandler>();

  enqueue<TPayload>(name: string, payload: TPayload): EnqueuedJob<TPayload> {
    const job: EnqueuedJob<TPayload> = {
      id: randomUUID(),
      name,
      payload,
      enqueuedAt: new Date().toISOString(),
    };

    this.jobs.push(job);
    return job;
  }

  registerHandler<TPayload>(name: string, handler: JobHandler<TPayload>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  /** Removes and returns the next job from the queue, or null if empty. */
  dequeue(): EnqueuedJob | null {
    return this.jobs.shift() ?? null;
  }

  getQueuedJobs(): readonly EnqueuedJob[] {
    return this.jobs;
  }

  /** Process one job if any; returns true if a job was processed. */
  async processNext(): Promise<boolean> {
    const job = this.dequeue();
    if (!job) return false;

    const handler = this.handlers.get(job.name);
    if (handler) {
      await handler(job);
    }
    return true;
  }
}
