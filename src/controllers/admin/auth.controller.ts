import { Body, Controller, Post, Route, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import { ApiResponse } from '../../interfaces/apiResponse.interface';
import { AdminAuthSchema } from '../../schemas/admin-auth.schema';
import { AdminAuthService } from '../../services/admin/auth.service';
import { AdminLoginResponse } from '../../interfaces/admin.interface';

@Route('/admin/auth')
@Tags('Admin Auth System')
@injectable()
export class AdminAuthController extends Controller {
  constructor(private adminAuthService: AdminAuthService) {
    super();
  }

  @Post('')
  async create(
    @Body() body: AdminAuthSchema,
  ): Promise<ApiResponse<AdminLoginResponse>> {
    const data = await this.adminAuthService.login(body);

    return {
      data,
      message: 'API response message',
      success: true,
    };
  }
}
