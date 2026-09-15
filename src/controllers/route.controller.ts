import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { AddRouteStopDTO, CreateRouteDTO, RouteService, UpdateRouteDTO } from '../services/route.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/routes')
@Tags('Routes')
@Security('jwt')
@injectable()
export class RouteController extends Controller {
  constructor(private routeService: RouteService) {
    super();
  }

  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.routeService.getRoutesByCollege(tenantCollegeId);
    return { success: true, message: 'Routes fetched successfully', data };
  }

  @Get('/{id}')
  async getById(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req);
    const data = await this.routeService.getRouteById(id, tenantCollegeId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Route not found', data: null };
    }
    return { success: true, message: 'Route fetched successfully', data };
  }

  @Post('')
  async create(
    @Body() body: CreateRouteDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.routeService.createRoute(body);
      return { success: true, message: 'Route created successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to create route', data: null };
    }
  }

  @Put('/{id}')
  async update(
    @Path() id: string,
    @Body() body: UpdateRouteDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.routeService.updateRoute(id, body, tenantCollegeId);
      return { success: true, message: 'Route updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update route', data: null };
    }
  }

  @Delete('/{id}')
  async delete(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      await this.routeService.deleteRoute(id, tenantCollegeId);
      return { success: true, message: 'Route deactivated successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to deactivate route', data: null };
    }
  }

  @Post('/stops')
  async addStop(
    @Body() body: AddRouteStopDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.routeService.addStop(body, tenantCollegeId);
      return { success: true, message: 'Route stop added successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to add route stop', data: null };
    }
  }

  @Delete('/stops/{stopId}')
  async deleteStop(
    @Path() stopId: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      await this.routeService.deleteStop(stopId, tenantCollegeId);
      return { success: true, message: 'Route stop removed successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to remove stop', data: null };
    }
  }
}
