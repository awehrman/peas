import { BaseAction } from '../../../../workers/core/base-action';
import type { ActionContext } from '../../../../workers/core/types';
import { ActionName } from '../../../../types';
import type { ImageSaveData, ImageWorkerDependencies } from '../../../../workers/image/types';
import { saveImage } from './service';

export class SaveImageAction extends BaseAction<ImageSaveData, ImageWorkerDependencies, ImageSaveData> {
  name = ActionName.SAVE_IMAGE;

  async execute(
    data: ImageSaveData,
    dependencies: ImageWorkerDependencies,
    _context: ActionContext
  ): Promise<ImageSaveData> {
    return saveImage(data, dependencies.serviceContainer, dependencies.logger);
  }
} 