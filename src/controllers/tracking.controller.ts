import { Body, Controller, Get, Path, Post, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { LocationUpdateDTO, TrackingService } from '../services/tracking.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

@Route('api/v1/tracking')
@Tags('Live Bus Tracking')
@Security('jwt')
@injectable()
export class TrackingController extends Controller {
  constructor(private trackingService: TrackingService) {
    super();
  }

  /**
   * Update real-time GPS location coordinates of a bus.
   *
   * ### Intent & Business Purpose
   * Receives real-time GPS coordinates (latitude, longitude, speed, heading) from driver mobile device or onboard IoT tracking device. Updates live tracking state and broadcasts via WebSockets.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `DRIVER`.
   *
   * ### Request Body
   * - `busId` *(required string)*: Bus vehicle UUID.
   * - `latitude` *(required number)*: GPS latitude coordinate.
   * - `longitude` *(required number)*: GPS longitude coordinate.
   * - `speed` *(optional number)*: Current vehicle speed (km/h).
   * - `heading` *(optional number)*: Heading angle / direction in degrees.
   *
   * ### Side Effects
   * - Broadcasts updated coordinates to WebSocket rooms (`bus:{busId}` and `college:{collegeId}`).
   *
   * @param body Real-time GPS location update payload.
   * @Response<ApiResponse>(200, "Location updated successfully.")
   * @Response<ApiResponse>(400, "Invalid coordinates or missing bus ID.")
   */
  @Post('/update-location')
  @Security('jwt', [UserRole.DRIVER, UserRole.ADMIN])
  async updateLocation(@Body() body: LocationUpdateDTO): Promise<ApiResponse> {
    try {
      const data = await this.trackingService.updateLocation(body);
      return { success: true, message: 'Location updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update location', data: null };
    }
  }

  /**
   * Get current live GPS location & shift state of a specific bus.
   *
   * ### Intent & Business Purpose
   * Fetches real-time location, speed, direction, and active shift details for a given bus. Used by students/parents on map views.
   *
   * ### Path Parameters
   * - `busId` *(required string)*: Bus UUID.
   *
   * @param busId Bus UUID.
   * @Response<ApiResponse>(200, "Bus tracking state fetched successfully.")
   * @Response<ApiResponse>(404, "Active tracking state not found for this bus.")
   */
  @Get('/bus/{busId}')
  async getBusTracking(@Path() busId: string): Promise<ApiResponse> {
    try {
      const data = await this.trackingService.getBusTracking(busId);
      return { success: true, message: 'Bus tracking state fetched successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 404);
      return { success: false, message: err.message || 'Bus tracking not found', data: null };
    }
  }

  /**
   * Get lightweight real-time GPS location of a specific bus.
   *
   * ### Intent & Business Purpose
   * Returns lightweight real-time coordinates and speed of a bus for mobile app polling without returning heavy route or driver objects.
   *
   * ### Path Parameters
   * - `busId` *(required string)*: Bus UUID.
   *
   * @param busId Bus UUID.
   * @Response<ApiResponse>(200, "Bus realtime location fetched successfully.")
   * @Response<ApiResponse>(403, "Access denied outside authorized college scope.")
   * @Response<ApiResponse>(404, "Bus not found.")
   */
  @Get('/bus/{busId}/location')
  async getBusLiveLocation(
    @Path() busId: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.trackingService.getBusLiveLocation(busId, tenantCollegeId);
      return { success: true, message: 'Bus realtime location fetched successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 404);
      return { success: false, message: err.message || 'Bus realtime location not found', data: null };
    }
  }

  /**
   * Get real-time tracking overview for all buses in a college fleet.
   *
   * ### Intent & Business Purpose
   * Returns live location snapshot for all active buses belonging to the college campus. Used by college admins on command center map.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * @param collegeId Optional college UUID filter.
   * @Response<ApiResponse>(200, "Fleet tracking data fetched successfully.")
   */
  @Get('/fleet')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async getCollegeFleetTracking(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.trackingService.getCollegeFleetTracking(tenantCollegeId);
    return { success: true, message: 'Fleet tracking fetched successfully', data };
  }
}
