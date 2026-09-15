import { Body, Controller, Delete, Get, Path, Post, Put, Query, Request, Route, Security, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import express from 'express';
import { ApiResponse } from '../interfaces/apiResponse.interface';
import { AssignStudentBusDTO, AssignStudentStopDTO, CreateStudentDTO, StudentService, UpdateStudentDTO } from '../services/student.service';
import { resolveTenantCollegeId } from '../middlewares/auth.middleware';

@Route('api/v1/students')
@Tags('Students')
@Security('jwt')
@injectable()
export class StudentController extends Controller {
  constructor(private studentService: StudentService) {
    super();
  }

  @Get('')
  async getAll(
    @Request() req: express.Request,
    @Query() collegeId?: string
  ): Promise<ApiResponse> {
    const tenantCollegeId = resolveTenantCollegeId(req, collegeId);
    const data = await this.studentService.getStudentsByCollege(tenantCollegeId);
    return { success: true, message: 'Students fetched successfully', data };
  }

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

  @Post('')
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

  @Put('/{id}')
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

  @Delete('/{id}')
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

  @Post('/assign-bus')
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

  @Post('/assign-stop')
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
