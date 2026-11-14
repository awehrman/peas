import { ActionName } from "../../types";
import type { ActionFactory } from "../../workers/core/action-factory";
import { BaseAction } from "../../workers/core/base-action";
import type { ActionContext } from "../../workers/core/types";
import {
  createActionRegistration,
  registerActions,
} from "../../workers/shared/action-registry";
import type {
  BookLookupJobData,
  BookLookupWorkerDependencies,
  SourceJobData,
  SourceWorkerDependencies,
} from "../../workers/source/dependencies";

export class CheckUrlAction extends BaseAction<SourceJobData, SourceWorkerDependencies, SourceJobData> {
  name = ActionName.CHECK_URL;

  async execute(
    data: SourceJobData,
    deps: SourceWorkerDependencies,
    context: ActionContext
  ): Promise<SourceJobData> {
    return deps.services.checkUrl(data, context.attemptNumber);
  }
}

export class RecheckStaleUrlsAction extends BaseAction<SourceJobData, SourceWorkerDependencies, SourceJobData> {
  name = ActionName.RECHECK_STALE_URLS;

  async execute(
    data: SourceJobData,
    deps: SourceWorkerDependencies,
    _context: ActionContext
  ): Promise<SourceJobData> {
    return deps.services.recheckStaleUrls(data);
  }
}

export class LookupBookAction extends BaseAction<BookLookupJobData, BookLookupWorkerDependencies, BookLookupJobData> {
  name = ActionName.LOOKUP_BOOK;

  async execute(
    data: BookLookupJobData,
    deps: BookLookupWorkerDependencies,
    _context: ActionContext
  ): Promise<BookLookupJobData> {
    return deps.services.lookupBook(data);
  }
}

export class LookupPendingBooksAction extends BaseAction<
  BookLookupJobData,
  BookLookupWorkerDependencies,
  BookLookupJobData
> {
  name = ActionName.LOOKUP_PENDING_BOOKS;

  async execute(
    data: BookLookupJobData,
    deps: BookLookupWorkerDependencies,
    _context: ActionContext
  ): Promise<BookLookupJobData> {
    return deps.services.lookupPendingBooks(data);
  }
}

export function registerSourceActions(
  factory: ActionFactory<SourceJobData, SourceWorkerDependencies, SourceJobData>
): void {
  registerActions(factory, [
    createActionRegistration<SourceJobData, SourceWorkerDependencies, SourceJobData>(
      ActionName.CHECK_URL,
      CheckUrlAction
    ),
    createActionRegistration<SourceJobData, SourceWorkerDependencies, SourceJobData>(
      ActionName.RECHECK_STALE_URLS,
      RecheckStaleUrlsAction
    ),
  ]);
}

export function registerBookLookupActions(
  factory: ActionFactory<BookLookupJobData, BookLookupWorkerDependencies, BookLookupJobData>
): void {
  registerActions(factory, [
    createActionRegistration<BookLookupJobData, BookLookupWorkerDependencies, BookLookupJobData>(
      ActionName.LOOKUP_BOOK,
      LookupBookAction
    ),
    createActionRegistration<BookLookupJobData, BookLookupWorkerDependencies, BookLookupJobData>(
      ActionName.LOOKUP_PENDING_BOOKS,
      LookupPendingBooksAction
    ),
  ]);
}
