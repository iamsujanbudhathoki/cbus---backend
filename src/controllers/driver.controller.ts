import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { CreateDriverDTO, DriverService, UpdateDriverDTO } from '../services/driver.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/drivers')
@Tags('Drivers')
@Security('jwt')
@injectable()
export class DriverController extends Controller {
  constructor(private driverService: DriverService) {
    super();
  }

  /**
   * List drivers for a college campus.
   *
   * ### Intent & Business Purpose
   * Retrieves all registered driver profiles associated with a college campus, including license number, assigned bus ID, and phone contact details.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`, `DRIVER`.
   * - **Access Control:** Scoped by tenant `collegeId`. Super Admins can filter using `collegeId` query param.
   *
   * @param collegeId Optional college UUID filter for Super Admins.
   * @Response<ApiResponse>(200, "Drivers list fetched successfully.")
   * @Response<ApiResponse>(401, "Unauthorized access.")
   */
  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.driverService.getDriversByCollege(tenantCollegeId);
    return { success: true, message: 'Drivers fetched successfully', data };
  }

  /**
   * Get driver profile details by ID.
   *
   * ### Intent & Business Purpose
   * Fetches specific driver record, associated user profile info, driving license number, and assigned bus.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Driver UUID.
   *
   * @param id Driver UUID.
   * @Response<ApiResponse>(200, "Driver profile fetched successfully.")
   * @Response<ApiResponse>(404, "Driver profile not found.")
   */
  @Get('/{id}')
  async getById(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req);
    const data = await this.driverService.getDriverById(id, tenantCollegeId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Driver not found', data: null };
    }
    return { success: true, message: 'Driver fetched successfully', data };
  }

  /**
   * Register a new driver profile.
   *
   * ### Intent & Business Purpose
   * Creates a driver account linked to a user account, assigning driving license details and college tenant.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * ### Request Body
   * - `userId` *(required string)*: Associated user account UUID.
   * - `licenseNumber` *(required string)*: Official driving license registration number.
   * - `collegeId` *(required string)*: College UUID.
   * - `busId` *(optional string)*: Assigned bus vehicle UUID.
   *
   * ### Side Effects
   * - Creates a record in the `drivers` table and updates user role to `DRIVER`.
   *
   * @param body Driver registration payload.
   * @Response<ApiResponse>(200, "Driver profile created successfully.")
   * @Response<ApiResponse>(400, "Validation error or duplicate driver license.")
   */
  @Post('')
  async create(
    @Body() body: CreateDriverDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.driverService.createDriver(body);
      return { success: true, message: 'Driver created successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to create driver', data: null };
    }
  }

  /**
   * Update driver information.
   *
   * ### Intent & Business Purpose
   * Updates driver license details, assigned bus vehicle, or contact information.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Driver UUID.
   *
   * @param id Driver UUID.
   * @param body Updates payload.
   * @Response<ApiResponse>(200, "Driver updated successfully.")
   * @Response<ApiResponse>(400, "Update validation error.")
   */
  @Put('/{id}')
  async update(
    @Path() id: string,
    @Body() body: UpdateDriverDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.driverService.updateDriver(id, body, tenantCollegeId);
      return { success: true, message: 'Driver updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update driver', data: null };
    }
  }

  /**
   * Deactivate driver profile.
   *
   * ### Intent & Business Purpose
   * Deactivates a driver profile from active campus operations.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Driver UUID.
   *
   * @param id Driver UUID.
   * @Response<ApiResponse>(200, "Driver deactivated successfully.")
   * @Response<ApiResponse>(400, "Deactivation failed.")
   */
  @Delete('/{id}')
  async delete(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      await this.driverService.deleteDriver(id, tenantCollegeId);
      return { success: true, message: 'Driver deactivated successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to deactivate driver', data: null };
    }
  }
}
