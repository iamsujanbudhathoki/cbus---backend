import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { CreateParentDTO, LinkStudentDTO, ParentService, UpdateParentDTO } from '../services/parent.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/parents')
@Tags('Parents')
@Security('jwt')
@injectable()
export class ParentController extends Controller {
  constructor(private parentService: ParentService) {
    super();
  }

  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.parentService.getParentsByCollege(tenantCollegeId);
    return { success: true, message: 'Parents fetched successfully', data };
  }

  @Get('/{id}')
  async getById(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req);
    const data = await this.parentService.getParentById(id, tenantCollegeId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Parent not found', data: null };
    }
    return { success: true, message: 'Parent fetched successfully', data };
  }

  @Get('/user/{userId}')
  async getByUserId(@Path() userId: string): Promise<ApiResponse> {
    const data = await this.parentService.getParentByUserId(userId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Parent profile not found', data: null };
    }
    return { success: true, message: 'Parent profile fetched successfully', data };
  }

  @Post('')
  async create(
    @Body() body: CreateParentDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.parentService.createParent(body);
      return { success: true, message: 'Parent created successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to create parent', data: null };
    }
  }

  @Put('/{id}')
  async update(
    @Path() id: string,
    @Body() body: UpdateParentDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.parentService.updateParent(id, body, tenantCollegeId);
      return { success: true, message: 'Parent updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update parent', data: null };
    }
  }

  @Delete('/{id}')
  async delete(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      await this.parentService.deleteParent(id, tenantCollegeId);
      return { success: true, message: 'Parent deleted successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to delete parent', data: null };
    }
  }

  @Post('/link-student')
  async linkStudent(@Body() body: LinkStudentDTO): Promise<ApiResponse> {
    try {
      const data = await this.parentService.linkStudent(body);
      return { success: true, message: 'Parent linked to student successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to link student', data: null };
    }
  }
}
