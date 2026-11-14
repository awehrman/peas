import {
  type BookLookupJobData,
  type BookLookupWorkerDependencies,
  type SourceJobData,
  type SourceWorkerDependencies,
  buildBookLookupDependencies,
  buildSourceDependencies,
} from "./dependencies";

import type { Queue } from "bullmq";

import type { IServiceContainer } from "../../services/container";
import {
  registerBookLookupActions,
  registerSourceActions,
} from "../../services/source/actions";
import { ActionName } from "../../types";
import { ActionFactory } from "../core/action-factory";
import { BaseWorker } from "../core/base-worker";
import type { ActionContext, WorkerAction } from "../core/types";

/** URL reachability checks: four at a time, at most five requests per second across the queue. */
export class SourceWorker extends BaseWorker<SourceJobData, SourceWorkerDependencies, SourceJobData> {
  constructor(
    queue: Queue,
    container: IServiceContainer,
    actionFactory?: ActionFactory<SourceJobData, SourceWorkerDependencies, SourceJobData>
  ) {
    super(queue, buildSourceDependencies(container), actionFactory, container);
  }

  protected getOperationName(): string {
    return "source";
  }

  protected getConcurrency(): number {
    return 4;
  }

  protected getRateLimit(): { max: number; duration: number } {
    return { max: 5, duration: 1000 };
  }

  protected registerActions(): void {
    registerSourceActions(this.actionFactory);
  }

  protected createActionPipeline(
    data: SourceJobData,
    _context: ActionContext
  ): WorkerAction<SourceJobData, SourceWorkerDependencies, SourceJobData>[] {
    const action = data.kind === "RECHECK_STALE_URLS" ? ActionName.RECHECK_STALE_URLS : ActionName.CHECK_URL;
    return [this.actionFactory.create(action, this.dependencies)];
  }
}

/** Open Library lookups: one at a time, at most one request per second, as the provider asks. */
export class BookLookupWorker extends BaseWorker<
  BookLookupJobData,
  BookLookupWorkerDependencies,
  BookLookupJobData
> {
  constructor(
    queue: Queue,
    container: IServiceContainer,
    actionFactory?: ActionFactory<BookLookupJobData, BookLookupWorkerDependencies, BookLookupJobData>
  ) {
    super(queue, buildBookLookupDependencies(container), actionFactory, container);
  }

  protected getOperationName(): string {
    return "book_lookup";
  }

  protected getConcurrency(): number {
    return 1;
  }

  protected getRateLimit(): { max: number; duration: number } {
    return { max: 1, duration: 1000 };
  }

  protected registerActions(): void {
    registerBookLookupActions(this.actionFactory);
  }

  protected createActionPipeline(
    data: BookLookupJobData,
    _context: ActionContext
  ): WorkerAction<BookLookupJobData, BookLookupWorkerDependencies, BookLookupJobData>[] {
    const action =
      data.kind === "LOOKUP_PENDING_BOOKS" ? ActionName.LOOKUP_PENDING_BOOKS : ActionName.LOOKUP_BOOK;
    return [this.actionFactory.create(action, this.dependencies)];
  }
}

export function createSourceWorker(queue: Queue, container: IServiceContainer): SourceWorker {
  return new SourceWorker(queue, container);
}

export function createBookLookupWorker(queue: Queue, container: IServiceContainer): BookLookupWorker {
  return new BookLookupWorker(queue, container);
}
