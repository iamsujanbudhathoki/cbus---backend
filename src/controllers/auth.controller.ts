import { Body, Controller, Get, Post, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { AuthService, LoginDTO, RegisterUserDTO } from '../services/auth.service';
import { COOKIE_NAME } from '../middlewares/auth.middleware';

@Route('api/v1/auth')
@Tags('Authentication')
@injectable()
export class AuthController extends Controller {
  constructor(private authService: AuthService) {
    super();
  }

  @Post('/login')
  async login(
    @Body() body: LoginDTO,
    @Request() req?: express.Request
  ): Promise<ApiResponse> {
    try {
      const data = await this.authService.login(body);
      if (req && req.res) {
        const isProduction = process.env.NODE_ENV === 'production' || process.env.BASE_URL?.includes('render.com');
        req.res.cookie(COOKIE_NAME, data.token, {
          httpOnly: true,
          sameSite: isProduction ? 'none' : 'lax',
          secure: isProduction,
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }
      return {
        success: true,
        message: 'Login successful',
        data,
      };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return {
        success: false,
        message: err.message || 'Login failed',
        data: null,
      };
    }
  }

  @Post('/logout')
  async logout(@Request() req?: express.Request): Promise<ApiResponse> {
    if (req && req.res) {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.BASE_URL?.includes('render.com');
      req.res.clearCookie(COOKIE_NAME, {
        path: '/',
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
      });
    }
    return {
      success: true,
      message: 'Logged out successfully',
      data: null,
    };
  }

  @Post('/register')
  async register(
    @Body() body: RegisterUserDTO,
    @Request() req?: express.Request
  ): Promise<ApiResponse> {
    try {
      const user = await this.authService.registerUser(body);
      return {
        success: true,
        message: 'User created successfully',
        data: { id: user.id, email: user.email, name: user.name, role: user.role, collegeId: user.collegeId },
      };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return {
        success: false,
        message: err.message || 'Registration failed',
        data: null,
      };
    }
  }

  @Get('/me')
  @Security('jwt')
  async getMe(@Request() req: express.Request): Promise<ApiResponse> {
    if (!req.user) {
      this.setStatus(401);
      return { success: false, message: 'Authentication session cookie required', data: null };
    }

    return {
      success: true,
      message: 'Profile fetched successfully',
      data: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        collegeId: req.user.collegeId,
        collegeName: req.user.collegeName,
        college: req.user.college,
        phoneNumber: req.user.phoneNumber,
        status: req.user.status,
      },
    };
  }
}
