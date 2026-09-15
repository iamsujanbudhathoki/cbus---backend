import { Body, Controller, Get, Path, Post, Query, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { LocationUpdateDTO, TrackingService } from '../services/tracking.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/tracking')
@Tags('Live Bus Tracking')
@Security('jwt')
@injectable()
export class TrackingController extends Controller {
  constructor(private trackingService: TrackingService) {
    super();
  }

  @Post('/update-location')
  async updateLocation(@Body() body: LocationUpdateDTO): Promise<ApiResponse> {
    try {
      const data = await this.trackingService.updateLocation(body);
      return { success: true, message: 'Location updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update location', data: null };
    }
  }

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

  @Get('/fleet')
  async getCollegeFleetTracking(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.trackingService.getCollegeFleetTracking(tenantCollegeId);
    return { success: true, message: 'Fleet tracking fetched successfully', data };
  }
}
