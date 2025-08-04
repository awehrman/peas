import { BaseAction } from '../../../../workers/core/base-action';
import type { ActionContext } from '../../../../workers/core/types';
import { ActionName } from '../../../../types';
import type { ImageSaveData, ImageWorkerDependencies } from '../../../../workers/image/types';
import { imageCompletedStatus } from './service';

export class ImageCompletedStatusAction extends BaseAction<ImageSaveData, ImageWorkerDependencies, ImageSaveData> {
  name = ActionName.IMAGE_COMPLETED_STATUS;

  async execute(
    data: ImageSaveData,
    dependencies: ImageWorkerDependencies,
    _context: ActionContext
  ): Promise<ImageSaveData> {
    return imageCompletedStatus(data, dependencies.serviceContainer, dependencies.logger);
  }
} 