import { Role, Status } from '../types/enums';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  collegeId?: string;
  collegeName?: string;
  college?: {
    id: string;
    name: string;
    code?: string;
  };
  phoneNumber?: string;
  status: Status;
}
