import { autoInjectable } from 'tsyringe';
import { MediaType } from '../../types/enums';

@autoInjectable()
export class MediaService {
  async uploadMedia(file: any, type: MediaType) {
    return { fileName: file?.filename || '', filePath: file?.path || '' };
  }
}
