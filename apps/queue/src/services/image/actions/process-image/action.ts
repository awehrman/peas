import { BaseAction } from '../../../../workers/core/base-action';
import type { ActionContext } from '../../../../workers/core/types';
import { ActionName } from '../../../../types';
import type { ImageProcessingData, ImageSaveData, ImageWorkerDependencies } from '../../../../workers/image/types';
import { processImage } from './service';

export class ProcessImageAction extends BaseAction<ImageProcessingData, ImageWorkerDependencies, ImageSaveData> {
  name = ActionName.PROCESS_IMAGE;

  async execute(
    data: ImageProcessingData,
    dependencies: ImageWorkerDependencies,
    _context: ActionContext
  ): Promise<ImageSaveData> {
    return processImage(data, dependencies.logger);
  }
} 