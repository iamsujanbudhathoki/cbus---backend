import { Body, Controller, Get, Path, Post, Put, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { DriverShiftService, StartShiftDTO, UpdateNotesDTO } from '../services/driver-shift.service';
import { AppError } from '../utils/appError.util';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

@Route('api/v1/driver-shifts')
@Tags('Driver Shifts')
@Security('jwt')
@injectable()
export class DriverShiftController extends Controller {
  constructor(private driverShiftService: DriverShiftService) {
    super();
  }

  private getUserId(req: express.Request): string {
    if (!req.user || !req.user.id) {
      throw AppError.unauthorized('Authentication session cookie required');
    }
    return req.user.id;
  }

  /**
   * Fetch active driver portal dashboard state.
   *
   * ### Intent & Business Purpose
   * Retrieves active shift details, assigned bus info, assigned route stops, and current active shift status for the authenticated driver.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `DRIVER`.
   * - **Access Control:** Requires active driver session JWT.
   *
   * @Response<ApiResponse>(200, "Driver portal data retrieved successfully.")
   * @Response<ApiResponse>(401, "Unauthorized - Invalid driver session.")
   */
  @Get('/portal')
  @Security('jwt', [UserRole.DRIVER, UserRole.ADMIN])
  async getPortal(@Request() req: express.Request): Promise<ApiResponse> {
    try {
      const userId = this.getUserId(req);
      const data = await this.driverShiftService.getDriverPortal(userId);
      return { success: true, message: 'Driver portal data fetched', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to fetch portal data', data: null };
    }
  }

  /**
   * Start a new driving shift & initiate live GPS tracking.
   *
   * ### Intent & Business Purpose
   * Initiates an active bus shift for the authenticated driver. Marks the bus as active on live tracking maps and initializes Firebase Realtime DB tracking node.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `DRIVER`.
   *
   * ### Side Effects
   * - Inserts active shift into `driver_shifts` table with status `ONGOING` / `STARTED`.
   * - Initializes live tracking node in Firebase Realtime Database.
   *
   * ### Edge Cases & QA Testing Focus
   * - Attempting to start a shift while another shift is currently active returns HTTP 400.
   *
   * @param body Optional start shift parameters (overriding bus/route if applicable).
   * @Response<ApiResponse>(200, "Shift started successfully.")
   * @Response<ApiResponse>(400, "Driver already has an active ongoing shift.")
   */
  @Post('/start')
  @Security('jwt', [UserRole.DRIVER, UserRole.ADMIN])
  async startShift(
    @Request() req: express.Request,
    @Body() body?: StartShiftDTO
  ): Promise<ApiResponse> {
    try {
      const userId = this.getUserId(req);
      const data = await this.driverShiftService.startShift(userId, body);
      return { success: true, message: 'Shift started successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to start shift', data: null };
    }
  }

  /**
   * Update notes or remarks for an ongoing or completed shift.
   *
   * ### Intent & Business Purpose
   * Allows drivers to append operational notes (e.g. traffic delays, route detours, fuel stops, incidents).
   *
   * ### Path Parameters
   * - `id` *(required string)*: Driver shift UUID.
   *
   * @param id Driver shift UUID.
   * @param body Payload containing `notes` text.
   * @Response<ApiResponse>(200, "Shift notes updated successfully.")
   */
  @Put('/{id}/notes')
  @Security('jwt', [UserRole.DRIVER, UserRole.ADMIN])
  async updateNotes(
    @Request() req: express.Request,
    @Path() id: string,
    @Body() body: UpdateNotesDTO
  ): Promise<ApiResponse> {
    try {
      const userId = this.getUserId(req);
      const data = await this.driverShiftService.updateShiftNotes(userId, id, body.notes);
      return { success: true, message: 'Shift notes updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update shift notes', data: null };
    }
  }

  /**
   * Complete & end an active driving shift.
   *
   * ### Intent & Business Purpose
   * Ends an active driver shift, records end timestamp, calculates total shift duration, and sets tracking status to completed.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Shift UUID.
   *
   * ### Side Effects
   * - Updates shift record status to `COMPLETED` and sets `endedAt` timestamp.
   * - Clears / updates active tracking node in Firebase Realtime DB.
   *
   * @param id Shift UUID.
   * @Response<ApiResponse>(200, "Shift completed successfully.")
   * @Response<ApiResponse>(400, "Shift already ended or not found.")
   */
  @Post('/{id}/end')
  @Security('jwt', [UserRole.DRIVER, UserRole.ADMIN])
  async endShift(
    @Request() req: express.Request,
    @Path() id: string
  ): Promise<ApiResponse> {
    try {
      const userId = this.getUserId(req);
      const data = await this.driverShiftService.endShift(userId, id);
      return { success: true, message: 'Shift completed successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to end shift', data: null };
    }
  }

  /**
   * Get driver's historical shift logs.
   *
   * ### Intent & Business Purpose
   * Retrieves past shift logs for the authenticated driver filtered by date range (e.g. `today`, `week`, `month`, `all`).
   *
   * ### Query Parameters
   * - `range` *(optional string)*: Date range filter (`today`, `week`, `month`, `all`).
   *
   * @param range Optional date range filter.
   * @Response<ApiResponse>(200, "Shift history fetched successfully.")
   */
  @Get('/history')
  @Security('jwt', [UserRole.DRIVER, UserRole.ADMIN])
  async getHistory(
    @Request() req: express.Request,
    @Query() range?: string
  ): Promise<ApiResponse> {
    try {
      const userId = this.getUserId(req);
      const data = await this.driverShiftService.getDriverHistory(userId, range);
      return { success: true, message: 'Driver shift history fetched', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to fetch shift history', data: null };
    }
  }

  /**
   * Administrative view of driver shifts across college campus.
   *
   * ### Intent & Business Purpose
   * Allows college admins to inspect active and past driver shifts across the fleet, filter by driver ID, and audit shift completion.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * ### Query Parameters
   * - `collegeId` *(optional string)*: Filter by target college UUID.
   * - `driverId` *(optional string)*: Filter by specific driver UUID.
   *
   * @param collegeId Optional college UUID filter.
   * @param driverId Optional driver UUID filter.
   * @Response<ApiResponse>(200, "Admin driver shifts retrieved successfully.")
   */
  @Get('/admin')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async getAdminShifts(
    @Request() req: express.Request,
    @Query() collegeId?: string,
    @Query() driverId?: string
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
      const data = await this.driverShiftService.getAdminShifts(tenantCollegeId, driverId);
      return { success: true, message: 'Admin driver shifts fetched', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to fetch admin driver shifts', data: null };
    }
  }
}
