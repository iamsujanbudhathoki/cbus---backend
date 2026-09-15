import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
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

  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.driverService.getDriversByCollege(tenantCollegeId);
    return { success: true, message: 'Drivers fetched successfully', data };
  }

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
