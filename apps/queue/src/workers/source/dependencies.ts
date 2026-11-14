import type { IServiceContainer } from "../../services/container";
import type {
  BookLookupJobData,
  SourceJobData,
} from "../../services/source/service";
import type { BaseWorkerDependencies } from "../types";

export type { BookLookupJobData, SourceJobData };

export interface SourceWorkerDependencies extends BaseWorkerDependencies {
  services: {
    checkUrl: (data: SourceJobData, attemptNumber: number) => Promise<SourceJobData>;
    recheckStaleUrls: (data: SourceJobData) => Promise<SourceJobData>;
  };
}

export interface BookLookupWorkerDependencies extends BaseWorkerDependencies {
  services: {
    lookupBook: (data: BookLookupJobData) => Promise<BookLookupJobData>;
    lookupPendingBooks: (data: BookLookupJobData) => Promise<BookLookupJobData>;
  };
}

export function buildSourceDependencies(container: IServiceContainer): SourceWorkerDependencies {
  return {
    logger: container.logger,
    services: {
      checkUrl: async (data, attemptNumber) => {
        const { runUrlCheck, URL_CHECK_JOB_OPTIONS } = await import("../../services/source/service");
        return runUrlCheck(data, container.logger, {
          attemptNumber,
          maxAttempts: URL_CHECK_JOB_OPTIONS.attempts,
        });
      },
      recheckStaleUrls: async (data) => {
        const { recheckStaleUrls } = await import("../../services/source/service");
        const { enqueueUrlCheck } = await import("../../services/source/enqueue");
        await recheckStaleUrls(container.logger, async (urlId) => {
          await enqueueUrlCheck(container.queues.sourceQueue, urlId);
        });
        return data;
      },
    },
  };
}

export function buildBookLookupDependencies(container: IServiceContainer): BookLookupWorkerDependencies {
  return {
    logger: container.logger,
    services: {
      lookupBook: async (data) => {
        const { runBookLookup } = await import("../../services/source/service");
        return runBookLookup(data, container.logger);
      },
      lookupPendingBooks: async (data) => {
        const { lookupPendingBooks } = await import("../../services/source/service");
        const { enqueueBookLookup } = await import("../../services/source/enqueue");
        await lookupPendingBooks(container.logger, async (lookupId) => {
          await enqueueBookLookup(container.queues.bookLookupQueue, lookupId);
        });
        return data;
      },
    },
  };
}
