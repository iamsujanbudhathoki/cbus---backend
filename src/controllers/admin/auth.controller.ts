import { Body, Controller, Post, Response, Route, Tags } from 'tsoa';
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

  /**
   * Super Admin portal authentication.
   *
   * ### Intent & Business Purpose
   * Authenticates platform Super Administrators into the central multi-tenant management portal.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** System Administrators (`ADMIN`).
   * - **Access Control:** Public endpoint specifically for platform super admin authentication.
   *
   * ### Key Rules & Behavior
   * - Validates admin credentials against system admin accounts.
   * - Returns admin user details and bearer authorization token.
   *
   * @param body Admin login credentials including admin email/username and password.
   * @Response<ApiResponse<AdminLoginResponse>>(200, "Super Admin authenticated successfully.")
   * @Response<ApiResponse>(400, "Invalid admin credentials.")
   */
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
