import { singleton } from 'tsyringe';
import { User } from '../entities';
import { Role, Status } from '../types/enums';
import BcryptService from '../utils/bcrypt.util';
import { generateToken, JwtUserPayload } from '../middlewares/auth.middleware';
import { AppError } from '../utils/appError.util';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterUserDTO {
  email: string;
  password: string;
  name: string;
  role: Role;
  collegeId?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  token: string;
  user: {
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
  };
}

@singleton()
export class AuthService {
  async login(dto: LoginDTO): Promise<AuthResponse> {
    const user = await User.createQueryBuilder('user')
      .leftJoinAndSelect('user.college', 'college')
      .addSelect('user.password')
      .where('user.email = :email', { email: dto.email.toLowerCase().trim() })
      .getOne();

    if (!user) {
      throw AppError.unauthorized('Invalid email or password');
    }

    if (user.status !== Status.ACTIVE) {
      throw AppError.forbidden('Account is inactive or deactivated');
    }

    const isMatch = await BcryptService.compare(dto.password, user.password);
    if (!isMatch) {
      throw AppError.unauthorized('Invalid email or password');
    }

    const payload: JwtUserPayload = {
      id: user.id,
      role: user.role,
    };

    const token = generateToken(payload);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId || undefined,
        collegeName: user.college?.name,
        college: user.college
          ? {
              id: user.college.id,
              name: user.college.name,
              code: user.college.code,
            }
          : undefined,
        phoneNumber: user.phoneNumber || undefined,
      },
    };
  }

  async registerUser(dto: RegisterUserDTO): Promise<User> {
    const existing = await User.findOne({ where: { email: dto.email.toLowerCase().trim() } });
    if (existing) {
      throw AppError.conflict('Email is already registered');
    }

    const user = new User();
    user.email = dto.email.toLowerCase().trim();
    user.password = dto.password;
    user.name = dto.name;
    user.role = dto.role;
    user.collegeId = dto.collegeId || undefined;
    user.phoneNumber = dto.phoneNumber || undefined;
    user.status = Status.ACTIVE;

    return await user.save();
  }

  async getUserById(id: string): Promise<User | null> {
    return await User.findOne({ where: { id }, relations: ['college'] });
  }
}
