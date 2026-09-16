import { Body, Controller, Get, Post, Request, Response, Route, Security, Tags } from 'tsoa';
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

  /**
   * User authentication & HTTP-only cookie issuance.
   *
   * ### Intent & Business Purpose
   * Authenticates user credentials (email and password), validates user account status, and issues a JWT token set as a secure HTTP-only cookie (`access_token`). Also returns user details and JWT token in response payload.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Public / Unauthenticated users (Students, Parents, Drivers, College Admins, Super Admins).
   * - **Access Control:** Public endpoint.
   *
   * ### Key Rules & Behavior
   * - Validates email format and compares password hash via bcrypt.
   * - Checks if the user account status is ACTIVE before granting access.
   * - Sets HTTP-only `access_token` cookie with 7-day expiration (`maxAge: 604800000 ms`).
   * - In production, cookie uses `sameSite: 'none'` and `secure: true`.
   *
   * ### Side Effects
   * - Sets `access_token` HTTP-only cookie on the response client.
   *
   * ### Edge Cases & QA Testing Focus
   * - Inactive or suspended accounts return HTTP 400 with `Account is inactive`.
   * - Invalid password returns HTTP 400 with `Invalid email or password`.
   * - Verify cross-site credentials (`withCredentials: true` / `credentials: 'include'`) are required on frontend fetch calls.
   *
   * @param body Login credentials containing `email` and `password`.
   * @Response<ApiResponse>(200, "Login successful. Access token cookie set.")
   * @Response<ApiResponse>(400, "Invalid credentials or inactive user account.")
   */
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

  /**
   * Clear session authentication cookie.
   *
   * ### Intent & Business Purpose
   * Invalidates the active user session on the client browser by clearing the HTTP-only `access_token` cookie.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** All authenticated or unauthenticated users.
   * - **Access Control:** Open endpoint.
   *
   * ### Key Rules & Behavior
   * - Immediately expires the `access_token` cookie (`expires: 1970-01-01T00:00:00.000Z`).
   * - Clears client-side cookie storage across all paths.
   *
   * ### Side Effects
   * - Clears `access_token` cookie on the response.
   *
   * @Response<ApiResponse>(200, "Logged out successfully and session cookie cleared.")
   */
  @Post('/logout')
  async logout(@Request() req?: express.Request): Promise<ApiResponse> {
    if (req && req.res) {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.BASE_URL?.includes('render.com');
      const cookieOptions = {
        path: '/',
        sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
        secure: isProduction,
        httpOnly: true,
        expires: new Date(0),
      };
      req.res.cookie(COOKIE_NAME, '', cookieOptions);
      req.res.clearCookie(COOKIE_NAME, cookieOptions);
    }
    return {
      success: true,
      message: 'Logged out successfully',
      data: null,
    };
  }

  /**
   * User self-registration / account onboarding.
   *
   * ### Intent & Business Purpose
   * Creates a new user profile record with specified role and college assignment. Used during user sign-up or admin onboarding workflows.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Public / Admins.
   * - **Access Control:** Unauthenticated users or onboarding admins.
   *
   * ### Key Rules & Behavior
   * - Hashes the plain-text password with bcrypt before storage.
   * - Enforces unique constraint on user `email`.
   * - Validates target `collegeId` existence if provided.
   *
   * ### Side Effects
   * - Inserts a new row into the `users` table.
   *
   * ### Edge Cases & QA Testing Focus
   * - Duplicate email registration returns HTTP 400 error.
   * - Invalid `collegeId` returns HTTP 400 foreign key validation error.
   *
   * @param body User registration details including `name`, `email`, `password`, `role`, and optional `collegeId`.
   * @Response<ApiResponse>(200, "User account created successfully.")
   * @Response<ApiResponse>(400, "Validation error, duplicate email, or missing required fields.")
   */
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

  /**
   * Retrieve active authenticated user profile (`/me`).
   *
   * ### Intent & Business Purpose
   * Returns complete profile details of the currently authenticated user based on the session JWT token (from HTTP cookie or Authorization header). Used by frontend apps on page load to initialize user context and role-based UI permissions.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Any authenticated user (`ADMIN`, `COLLEGE_ADMIN`, `DRIVER`, `PARENT`, `STUDENT`).
   * - **Access Control:** Requires valid JWT in `access_token` cookie or `Authorization: Bearer <token>` header.
   *
   * ### Key Rules & Behavior
   * - Extracts JWT from request, decodes user payload, and attaches `req.user`.
   * - Includes tenant context: `collegeId`, `collegeName`, and nested `college` object if assigned to a college.
   *
   * ### Edge Cases & QA Testing Focus
   * - Expired or missing JWT returns HTTP 401 Unauthorized.
   * - Verify profile updates (name/email changes) reflect immediately on `/me` response.
   *
   * @Response<ApiResponse>(200, "Active user profile fetched successfully.")
   * @Response<ApiResponse>(401, "Authentication session cookie missing or invalid.")
   */
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
