import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { AssignBusRouteDTO, BusService, CreateBusDTO, UpdateBusDTO } from '../services/bus.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/buses')
@Tags('Buses')
@Security('jwt')
@injectable()
export class BusController extends Controller {
  constructor(private busService: BusService) {
    super();
  }

  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.busService.getBusesByCollege(tenantCollegeId);
    return { success: true, message: 'Buses fetched successfully', data };
  }

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

  @Post('')
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

  @Put('/{id}')
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

  @Delete('/{id}')
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

  @Post('/assign-route')
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
