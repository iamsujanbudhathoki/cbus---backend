import { Body, Controller, Delete, Get, Path, Post, Put, Request, Route, Security, Tags } from 'tsoa';
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

  @Get('')
  async getAll(): Promise<ApiResponse> {
    const data = await this.collegeService.getAllColleges();
    return { success: true, message: 'Colleges fetched successfully', data };
  }

  @Get('/platform-metrics')
  @Security('jwt', ['ADMIN'])
  async getPlatformMetrics(): Promise<ApiResponse> {
    const data = await this.collegeService.getPlatformMetrics();
    return { success: true, message: 'Platform metrics fetched successfully', data };
  }

  @Get('/{id}')
  async getById(@Path() id: string): Promise<ApiResponse> {
    const data = await this.collegeService.getCollegeById(id);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'College not found', data: null };
    }
    return { success: true, message: 'College fetched successfully', data };
  }

  @Get('/{id}/metrics')
  async getCollegeMetrics(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, id);
    const data = await this.collegeService.getCollegeMetrics(tenantCollegeId || id);
    return { success: true, message: 'College metrics fetched successfully', data };
  }

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
