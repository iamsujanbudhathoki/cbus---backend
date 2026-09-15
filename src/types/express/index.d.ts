import { AuthUser } from '../../interfaces/authUser.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}



