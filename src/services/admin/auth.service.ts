import { autoInjectable } from 'tsyringe';
import { AdminAuthSchema } from '../../schemas/admin-auth.schema';
import { AdminLoginResponse } from '../../interfaces/admin.interface';

@autoInjectable()
export class AdminAuthService {
  async login(data: AdminAuthSchema): Promise<AdminLoginResponse> {
    return { token: '' };
  }
}
