import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { CreateParentDTO, LinkStudentDTO, ParentService, UpdateParentDTO } from '../services/parent.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

@Route('api/v1/parents')
@Tags('Parents')
@Security('jwt')
@injectable()
export class ParentController extends Controller {
  constructor(private parentService: ParentService) {
    super();
  }

  /**
   * List parents for a college campus.
   *
   * ### Intent & Business Purpose
   * Fetches parent profiles registered under a specific college campus, including linked student IDs and contact details.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * @param collegeId Optional college UUID filter.
   * @Response<ApiResponse>(200, "Parents list fetched successfully.")
   */
  @Get('')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.parentService.getParentsByCollege(tenantCollegeId);
    return { success: true, message: 'Parents fetched successfully', data };
  }

  /**
   * Get parent record by ID.
   *
   * ### Intent & Business Purpose
   * Retrieves specific parent profile details and linked student records.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Parent UUID.
   *
   * @param id Parent UUID.
   * @Response<ApiResponse>(200, "Parent profile retrieved successfully.")
   * @Response<ApiResponse>(404, "Parent not found.")
   */
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

  /**
   * Get parent record by associated User account ID.
   *
   * ### Intent & Business Purpose
   * Used during login context resolution to find parent entity linked to user ID.
   *
   * ### Path Parameters
   * - `userId` *(required string)*: User UUID.
   *
   * @param userId User UUID.
   * @Response<ApiResponse>(200, "Parent profile retrieved.")
   * @Response<ApiResponse>(404, "Parent profile not found.")
   */
  @Get('/user/{userId}')
  async getByUserId(@Path() userId: string): Promise<ApiResponse> {
    const data = await this.parentService.getParentByUserId(userId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Parent profile not found', data: null };
    }
    return { success: true, message: 'Parent profile fetched successfully', data };
  }

  /**
   * Get lightweight real-time bus locations for a parent user account.
   *
   * ### Intent & Business Purpose
   * Fetches lightweight real-time tracking coordinates for the bus(es) assigned to the parent's linked child(ren). Optimized for mobile app consumption.
   *
   * ### Path Parameters
   * - `userId` *(required string)*: Parent User UUID.
   *
   * @param userId Parent User UUID.
   * @Response<ApiResponse>(200, "Parent realtime bus location fetched successfully.")
   * @Response<ApiResponse>(403, "Access denied outside authorized college scope.")
   * @Response<ApiResponse>(404, "Parent profile not found.")
   */
  @Get('/user/{userId}/live-location')
  async getLiveLocationByUserId(
    @Path() userId: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.parentService.getParentLiveLocationByUserId(userId, tenantCollegeId);
      return { success: true, message: 'Parent realtime bus location fetched successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to fetch realtime bus location', data: null };
    }
  }

  /**
   * Register a new parent profile.
   *
   * ### Intent & Business Purpose
   * Registers a parent entity linked to a user account and college tenant.
   *
   * ### Request Body
   * - `userId` *(required string)*: Associated user UUID.
   * - `collegeId` *(required string)*: College UUID.
   * - `relationship` *(optional string)*: Relationship (e.g. `Father`, `Mother`, `Guardian`).
   *
   * @param body Parent creation details.
   * @Response<ApiResponse>(200, "Parent profile created.")
   * @Response<ApiResponse>(400, "Creation error.")
   */
  @Post('')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
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

  /**
   * Update parent profile details.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Parent UUID.
   *
   * @param id Parent UUID.
   * @param body Update fields.
   * @Response<ApiResponse>(200, "Parent profile updated.")
   */
  @Put('/{id}')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
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

  /**
   * Delete parent profile.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Parent UUID.
   *
   * @param id Parent UUID.
   * @Response<ApiResponse>(200, "Parent profile deleted.")
   */
  @Delete('/{id}')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
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

  /**
   * Link a parent profile to a student record.
   *
   * ### Intent & Business Purpose
   * Establishes a parent-student relationship. Enables the parent user to track the bus assigned to their child.
   *
   * ### Request Body
   * - `parentId` *(required string)*: Parent UUID.
   * - `studentId` *(required string)*: Student UUID.
   *
   * ### Side Effects
   * - Creates an association entry in `parent_students` table.
   *
   * @param body Payload with `parentId` and `studentId`.
   * @Response<ApiResponse>(200, "Parent linked to student successfully.")
   * @Response<ApiResponse>(400, "Linking failed or record not found.")
   */
  @Post('/link-student')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE, UserRole.PARENT])
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
