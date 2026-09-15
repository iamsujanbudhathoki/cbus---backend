import { Body, Controller, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { DriverShiftService, StartShiftDTO, UpdateNotesDTO } from '../services/driver-shift.service';
import { AppError } from '../utils/appError.util';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

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

  @Get('/portal')
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

  @Post('/start')
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

  @Put('/{id}/notes')
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

  @Post('/{id}/end')
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

  @Get('/history')
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

  @Get('/admin')
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
