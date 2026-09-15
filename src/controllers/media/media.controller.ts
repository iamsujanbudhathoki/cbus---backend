import { Controller, Post, Route, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import { ApiResponse } from '../../interfaces/apiResponse.interface';
import { MediaService } from '../../services/media/media.service';

@Route('api/v1/media')
@Tags('Media')
@injectable()
export class MediaController extends Controller {
  constructor(private mediaService: MediaService) {
    super();
  }

  @Post('/upload')
  async upload(): Promise<ApiResponse> {
    return { success: true, message: 'Media uploaded', data: null };
  }
}
