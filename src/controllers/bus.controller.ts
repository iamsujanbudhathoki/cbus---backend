import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { AssignBusRouteDTO, BusService, CreateBusDTO, UpdateBusDTO } from '../services/bus.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

@Route('api/v1/buses')
@Tags('Buses')
@Security('jwt')
@injectable()
export class BusController extends Controller {
  constructor(private busService: BusService) {
    super();
  }

  /**
   * List all buses (filtered by college tenant).
   *
   * ### Intent & Business Purpose
   * Fetches the list of registered buses assigned to a college campus. Used by fleet managers, admins, and tracking dashboards.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`, `DRIVER`, `PARENT`, `STUDENT`.
   * - **Access Control:** Requires valid JWT. College Admins and users are scoped strictly to their assigned `collegeId`. Super Admins can pass optional `collegeId` query parameter.
   *
   * ### Query Parameters
   * - `collegeId` *(optional string)*: Target college UUID. Overridden for tenant users.
   *
   * ### Edge Cases & QA Testing Focus
   * - Verify multi-tenant isolation: College A users cannot view buses from College B.
   * - Returns empty array if no buses are registered for the tenant.
   *
   * @param collegeId Optional college ID filter for Super Admins.
   * @Response<ApiResponse>(200, "List of buses retrieved successfully.")
   * @Response<ApiResponse>(401, "Unauthorized - Missing or invalid JWT session cookie.")
   */
  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.busService.getBusesByCollege(tenantCollegeId);
    return { success: true, message: 'Buses fetched successfully', data };
  }

  /**
   * Get bus details by ID.
   *
   * ### Intent & Business Purpose
   * Retrieves complete profile, current status, assigned driver, and assigned route details for a specific bus.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Authenticated users belonging to the tenant college.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Unique UUID of the bus.
   *
   * ### Edge Cases & QA Testing Focus
   * - Accessing a bus ID belonging to a different college tenant returns HTTP 404 Not Found.
   *
   * @param id Unique bus UUID.
   * @Response<ApiResponse>(200, "Bus details retrieved successfully.")
   * @Response<ApiResponse>(404, "Bus not found or tenant access denied.")
   */
  @Get('/{id}')
  async getById(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req);
    const data = await this.busService.getBusById(id, tenantCollegeId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Bus not found', data: null };
    }
    return { success: true, message: 'Bus fetched successfully', data };
  }

  /**
   * Register a new fleet bus.
   *
   * ### Intent & Business Purpose
   * Adds a new bus vehicle to the college fleet inventory with registration number, capacity, and model info.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   * - **Access Control:** Tenant College Admin or Super Admin.
   *
   * ### Request Body
   * - `busNumber` *(required string)*: Unique vehicle registration or plate number (e.g. `Ba 1 Pa 1234`).
   * - `capacity` *(required number)*: Passenger seating capacity.
   * - `model` *(optional string)*: Vehicle make/model.
   * - `collegeId` *(required string)*: Associated college ID.
   *
   * ### Side Effects
   * - Inserts a new record into the `buses` table.
   *
   * ### Edge Cases & QA Testing Focus
   * - Enforces unique `busNumber` per college tenant. Duplicate registration number returns HTTP 400.
   *
   * @param body Bus registration details.
   * @Response<ApiResponse>(200, "Bus created successfully.")
   * @Response<ApiResponse>(400, "Validation error or duplicate bus number.")
   */
  @Post('')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async create(
    @Body() body: CreateBusDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.busService.createBus(body);
      return { success: true, message: 'Bus created successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to create bus', data: null };
    }
  }

  /**
   * Update bus details.
   *
   * ### Intent & Business Purpose
   * Updates vehicle information, status (`ACTIVE`, `MAINTENANCE`, `INACTIVE`), or capacity.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Bus UUID.
   *
   * ### Side Effects
   * - Modifies existing `buses` table row.
   *
   * @param id Bus UUID.
   * @param body Fields to update.
   * @Response<ApiResponse>(200, "Bus updated successfully.")
   * @Response<ApiResponse>(400, "Update validation failure.")
   * @Response<ApiResponse>(404, "Bus not found.")
   */
  @Put('/{id}')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async update(
    @Path() id: string,
    @Body() body: UpdateBusDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.busService.updateBus(id, body, tenantCollegeId);
      return { success: true, message: 'Bus updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update bus', data: null };
    }
  }

  /**
   * Soft-delete / deactivate a bus.
   *
   * ### Intent & Business Purpose
   * Soft-deactivates a bus record from active operational fleet views.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Bus UUID.
   *
   * ### Side Effects
   * - Sets bus status to `INACTIVE` / soft deletes record.
   *
   * @param id Bus UUID.
   * @Response<ApiResponse>(200, "Bus deactivated successfully.")
   * @Response<ApiResponse>(400, "Deactivation failure.")
   */
  @Delete('/{id}')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async delete(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      await this.busService.deleteBus(id, tenantCollegeId);
      return { success: true, message: 'Bus deactivated successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to deactivate bus', data: null };
    }
  }

  /**
   * Assign bus to a specific transit route.
   *
   * ### Intent & Business Purpose
   * Maps a bus vehicle to a designated pickup/dropoff transit route (`routeId`).
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * ### Request Body
   * - `busId` *(required string)*: Bus UUID.
   * - `routeId` *(required string)*: Route UUID.
   * - `collegeId` *(optional string)*: College UUID.
   *
   * ### Side Effects
   * - Updates `routeId` foreign key on the `buses` record.
   *
   * ### Edge Cases & QA Testing Focus
   * - Verify route belongs to the same college tenant.
   *
   * @param body Assignment payload containing `busId` and `routeId`.
   * @Response<ApiResponse>(200, "Bus assigned to route successfully.")
   * @Response<ApiResponse>(400, "Invalid route/bus combination or tenant mismatch.")
   */
  @Post('/assign-route')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async assignRoute(
    @Body() body: AssignBusRouteDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.busService.assignRouteToBus(body, tenantCollegeId);
      return { success: true, message: 'Bus assigned to route successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to assign route', data: null };
    }
  }
}
