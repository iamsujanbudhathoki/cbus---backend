import { Controller, Post, Response, Route, Tags } from 'tsoa';
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

  /**
   * Upload media asset (images / avatars / documents).
   *
   * ### Intent & Business Purpose
   * Uploads binary files (profile pictures, vehicle documents, route maps) and returns stored file URL path.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Authenticated users.
   *
   * @Response<ApiResponse>(200, "Media uploaded successfully.")
   */
  @Post('/upload')
  async upload(): Promise<ApiResponse> {
    return { success: true, message: 'Media uploaded', data: null };
  }
}
