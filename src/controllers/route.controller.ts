import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Response, Route, Security, Tags } from 'tsoa';
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

  /**
   * List all transit routes for a college campus.
   *
   * ### Intent & Business Purpose
   * Fetches bus transit routes, start/end locations, and ordered pickup stops.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Authenticated users belonging to the tenant college.
   *
   * @param collegeId Optional college UUID filter for Super Admins.
   * @Response<ApiResponse>(200, "Routes list retrieved successfully.")
   */
  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.routeService.getRoutesByCollege(tenantCollegeId);
    return { success: true, message: 'Routes fetched successfully', data };
  }

  /**
   * Get route details and stop list by ID.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Route UUID.
   *
   * @param id Route UUID.
   * @Response<ApiResponse>(200, "Route details fetched.")
   * @Response<ApiResponse>(404, "Route not found.")
   */
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

  /**
   * Create a new transit route.
   *
   * ### Intent & Business Purpose
   * Creates a new transit route with name, start point, end point, and college tenant assignment.
   *
   * ### Request Body
   * - `name` *(required string)*: Route name (e.g. `Koteshwor - Balkhu Express`).
   * - `startLocation` *(required string)*: Route origin location.
   * - `endLocation` *(required string)*: Route destination location.
   * - `collegeId` *(required string)*: College UUID.
   *
   * @param body Route creation payload.
   * @Response<ApiResponse>(200, "Route created successfully.")
   * @Response<ApiResponse>(400, "Creation error.")
   */
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

  /**
   * Update route info.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Route UUID.
   *
   * @param id Route UUID.
   * @param body Update fields.
   * @Response<ApiResponse>(200, "Route updated.")
   */
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

  /**
   * Deactivate a transit route.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Route UUID.
   *
   * @param id Route UUID.
   * @Response<ApiResponse>(200, "Route deactivated.")
   */
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

  /**
   * Add a stop to a route.
   *
   * ### Intent & Business Purpose
   * Adds an intermediate pickup/dropoff stop with name, sequence order, latitude, longitude, and estimated arrival time.
   *
   * ### Request Body
   * - `routeId` *(required string)*: Target route UUID.
   * - `stopName` *(required string)*: Name of stop (e.g. `Kalanki Chowk`).
   * - `sequence` *(required number)*: Numerical sequence index on the route.
   * - `latitude` *(required number)*: Latitude coordinate.
   * - `longitude` *(required number)*: Longitude coordinate.
   * - `estimatedTime` *(optional string)*: Estimated arrival time (e.g. `07:30 AM`).
   *
   * @param body Route stop creation payload.
   * @Response<ApiResponse>(200, "Route stop added successfully.")
   * @Response<ApiResponse>(400, "Failed to add route stop.")
   */
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

  /**
   * Remove a stop from a route.
   *
   * ### Path Parameters
   * - `stopId` *(required string)*: Route stop UUID.
   *
   * @param stopId Stop UUID.
   * @Response<ApiResponse>(200, "Route stop removed successfully.")
   */
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
