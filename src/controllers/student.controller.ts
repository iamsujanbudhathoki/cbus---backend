import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Response, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { AssignStudentBusDTO, AssignStudentStopDTO, CreateStudentDTO, StudentService, UpdateStudentDTO } from '../services/student.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';
import { UserRole } from '../types/enums';

@Route('api/v1/students')
@Tags('Students')
@Security('jwt')
@injectable()
export class StudentController extends Controller {
  constructor(private studentService: StudentService) {
    super();
  }

  /**
   * List all student records for a college.
   *
   * ### Intent & Business Purpose
   * Retrieves student profiles for a college tenant, including roll number, batch, assigned bus ID, and pickup stop ID.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** `ADMIN`, `COLLEGE_ADMIN`.
   *
   * @param collegeId Optional college UUID filter for Super Admins.
   * @Response<ApiResponse>(200, "Students list retrieved successfully.")
   */
  @Get('')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.studentService.getStudentsByCollege(tenantCollegeId);
    return { success: true, message: 'Students fetched successfully', data };
  }

  /**
   * Get student details by ID.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Student UUID.
   *
   * @param id Student UUID.
   * @Response<ApiResponse>(200, "Student details retrieved successfully.")
   * @Response<ApiResponse>(404, "Student not found.")
   */
  @Get('/{id}')
  async getById(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req);
    const data = await this.studentService.getStudentById(id, tenantCollegeId);
    if (!data) {
      this.setStatus(404);
      return { success: false, message: 'Student not found', data: null };
    }
    return { success: true, message: 'Student fetched successfully', data };
  }

  /**
   * Register a student profile.
   *
   * ### Request Body
   * - `userId` *(required string)*: User account UUID.
   * - `rollNo` *(required string)*: Roll number or student ID.
   * - `collegeId` *(required string)*: College UUID.
   * - `batch` *(optional string)*: Academic batch or year.
   * - `busId` *(optional string)*: Bus UUID.
   * - `stopId` *(optional string)*: Pickup stop UUID.
   *
   * @param body Student registration payload.
   * @Response<ApiResponse>(200, "Student profile created.")
   * @Response<ApiResponse>(400, "Creation error.")
   */
  @Post('')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async create(
    @Body() body: CreateStudentDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.studentService.createStudent(body);
      return { success: true, message: 'Student created successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to create student', data: null };
    }
  }

  /**
   * Update student profile.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Student UUID.
   *
   * @param id Student UUID.
   * @param body Update fields.
   * @Response<ApiResponse>(200, "Student profile updated.")
   */
  @Put('/{id}')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async update(
    @Path() id: string,
    @Body() body: UpdateStudentDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      const data = await this.studentService.updateStudent(id, body, tenantCollegeId);
      return { success: true, message: 'Student updated successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to update student', data: null };
    }
  }

  /**
   * Deactivate a student profile.
   *
   * ### Path Parameters
   * - `id` *(required string)*: Student UUID.
   *
   * @param id Student UUID.
   * @Response<ApiResponse>(200, "Student deactivated.")
   */
  @Delete('/{id}')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async delete(
    @Path() id: string,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req);
      await this.studentService.deleteStudent(id, tenantCollegeId);
      return { success: true, message: 'Student deactivated successfully', data: null };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to deactivate student', data: null };
    }
  }

  /**
   * Assign bus to student.
   *
   * ### Request Body
   * - `studentId` *(required string)*: Student UUID.
   * - `busId` *(required string)*: Bus UUID.
   *
   * @param body Bus assignment payload.
   * @Response<ApiResponse>(200, "Student assigned to bus.")
   */
  @Post('/assign-bus')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async assignBus(
    @Body() body: AssignStudentBusDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.studentService.assignBusToStudent(body, tenantCollegeId);
      return { success: true, message: 'Student assigned to bus successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to assign bus', data: null };
    }
  }

  /**
   * Assign pickup stop to student.
   *
   * ### Request Body
   * - `studentId` *(required string)*: Student UUID.
   * - `stopId` *(required string)*: Route stop UUID.
   *
   * @param body Pickup stop assignment payload.
   * @Response<ApiResponse>(200, "Student assigned to route stop.")
   */
  @Post('/assign-stop')
  @Security('jwt', [UserRole.ADMIN, UserRole.COLLEGE])
  async assignStop(
    @Body() body: AssignStudentStopDTO,
    @Request() req: express.Request
  ): Promise<ApiResponse> {
    try {
      const tenantCollegeId = resolveTenantCollegeId(req, body.collegeId);
      if (tenantCollegeId) body.collegeId = tenantCollegeId;
      const data = await this.studentService.assignStopToStudent(body, tenantCollegeId);
      return { success: true, message: 'Student assigned to route stop successfully', data };
    } catch (err: any) {
      this.setStatus(err?.statusCode || 400);
      return { success: false, message: err.message || 'Failed to assign stop', data: null };
    }
  }
}
