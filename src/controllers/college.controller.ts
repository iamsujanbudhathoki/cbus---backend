import { Body, Controller, Delete, Get, Path, Post, Put, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { CollegeService, CreateCollegeDTO, UpdateCollegeDTO } from '../services/college.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/colleges')
@Tags('Colleges')
@Security('jwt')
@injectable()
export class CollegeController extends Controller {
  constructor(private collegeService: CollegeService) {
    super();
  }

  /**
   * List all colleges on the platform.
   *
   * ### Intent & Business Purpose
   * Returns a list of active college tenants registered on the bus tracking platform.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Authenticated users (`ADMIN`, `COLLEGE_ADMIN`, `DRIVER`, `PARENT`, `STUDENT`).
   *
   * @Response<ApiResponse>(200, "Colleges list retrieved successfully.")
   */
  @Get('')
  async getAll(): Promise<ApiResponse> {
    const data = await this.collegeService.getAllColleges();
    return { success: true, message: 'Colleges fetched successfully', data };
  }

  /**
   * Platform-wide aggregated analytics & metrics.
   *
   * ### Intent & Business Purpose
   * Provides high-level platform health metrics including total colleges, total active fleet buses, active drivers, registered students, and active tracking shifts across all tenants.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** System Administrator (`ADMIN`) only.
   * - **Access Control:** Restricted to Super Admin role.
   *
   * @Response<ApiResponse>(200, "Platform metrics aggregated successfully.")
   * @Response<ApiResponse>(403, "Forbidden - Super Admin permission required.")
   */
  @Get('/platform-metrics')
  @Security('jwt', ['ADMIN'])
  async getPlatformMetrics(): Promise<ApiResponse> {
    const data = await this.collegeService.getPlatformMetrics();
    return { success: true, message: 'Platform metrics fetched successfully', data };
  }

  /**
   * Get college details by ID.
   *
   * ### Intent & Business Purpose
   * Fetches specific college profile details, contact information, location coordinates, and active status.
   *
   * ### Path Parameters
   * - `id` *(required string)*: College UUID.
   *
   * @param id College UUID.
   * @Response<ApiResponse>(200, "College profile fetched successfully.")
   * @Response<ApiResponse>(404, "College not found.")
   */
  @Get('/{id}')
  async getById(@Path() id: string): Promise<ApiResponse> {
    const data = await this.collegeService.getCollegeById(id);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'College not found', data: null };
    }
    return { success: true, message: 'College fetched successfully', data };
  }

  /**
   * Get tenant dashboard metrics.
   *
   * ### Intent & Business Purpose
   * Returns specific college campus operational metrics (active buses count, total drivers, active routes, student headcount, active shifts).
   *
   * ### Path Parameters
   * - `id` *(required string)*: College UUID.
   *
   * @param id Target college UUID.
   * @Response<ApiResponse>(200, "College metrics fetched successfully.")
   */
  @Get('/{id}/metrics')
  async getCollegeMetrics(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, id);
    const data = await this.collegeService.getCollegeMetrics(tenantCollegeId || id);
    return { success: true, message: 'College metrics fetched successfully', data };
  }

  /**
   * Register a new college tenant.
   *
   * ### Intent & Business Purpose
   * Creates a new college organization entity on the platform. Enables multi-tenancy for the new institution.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** System Administrator (`ADMIN`).
   *
   * ### Request Body
   * - `name` *(required string)*: Full college name (e.g. `Kathmandu University`).
   * - `code` *(required string)*: Unique short code (e.g. `KU`).
   * - `address` *(optional string)*: Physical address.
   * - `contactEmail` *(optional string)*: Primary administrative email.
   *
   * ### Side Effects
   * - Inserts a new row into the `colleges` table.
   *
   * @param body College registration details.
   * @Response<ApiResponse>(200, "College created successfully.")
   * @Response<ApiResponse>(400, "Validation error or duplicate college code.")
   * @Response<ApiResponse>(403, "Forbidden - Super Admin permission required.")
   */
  @Post('')
  @Security('jwt', ['ADMIN'])
  async create(@Body() body: CreateCollegeDTO): Promise<ApiResponse> {
    try {
      const data = await this.collegeService.createCollege(body);
      return { success: true, message: 'College created successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to create college', data: null };
    }
  }

  /**
   * Update college profile details.
   *
   * ### Intent & Business Purpose
   * Modifies college tenant information, address, contact details, or active status.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** System Administrator (`ADMIN`).
   *
   * ### Path Parameters
   * - `id` *(required string)*: College UUID.
   *
   * @param id College UUID.
   * @param body Updates payload.
   * @Response<ApiResponse>(200, "College updated successfully.")
   * @Response<ApiResponse>(400, "Update validation failure.")
   */
  @Put('/{id}')
  @Security('jwt', ['ADMIN'])
  async update(@Path() id: string, @Body() body: UpdateCollegeDTO): Promise<ApiResponse> {
    try {
      const data = await this.collegeService.updateCollege(id, body);
      return { success: true, message: 'College updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update college', data: null };
    }
  }

  /**
   * Deactivate a college tenant.
   *
   * ### Intent & Business Purpose
   * Soft deletes / deactivates a college tenant from the system.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** System Administrator (`ADMIN`).
   *
   * ### Path Parameters
   * - `id` *(required string)*: College UUID.
   *
   * @param id College UUID.
   * @Response<ApiResponse>(200, "College deactivated successfully.")
   * @Response<ApiResponse>(400, "Deactivation failure.")
   */
  @Delete('/{id}')
  @Security('jwt', ['ADMIN'])
  async delete(@Path() id: string): Promise<ApiResponse> {
    try {
      await this.collegeService.deleteCollege(id);
      return { success: true, message: 'College deactivated successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to deactivate college', data: null };
    }
  }
}
