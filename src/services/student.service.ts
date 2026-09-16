import { singleton } from 'tsyringe';
import { Bus, ParentStudent, RouteStop, Student, StudentBusAssignment, StudentStopAssignment } from '../entities';
import { AssignmentType, Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { AppDataSource } from '../config/database.config';
import { In } from 'typeorm';

export interface CreateStudentDTO {
  collegeId: string;
  name: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  contact?: string;
  address?: string;
}

export interface UpdateStudentDTO {
  name?: string;
  rollNumber?: string;
  className?: string;
  section?: string;
  contact?: string;
  address?: string;
  status?: Status;
}

export interface AssignStudentBusDTO {
  studentId: string;
  busId: string;
  collegeId: string;
}

export interface AssignStudentStopDTO {
  studentId: string;
  stopId: string;
  collegeId: string;
  assignmentType?: AssignmentType;
}

function normalizeUuid(id?: string | null): string | null {
  if (!id || id === 'none' || id === 'unassigned' || id.trim() === '' || id === 'null' || id === 'undefined') {
    return null;
  }
  return id.trim();
}

@singleton()
export class StudentService {
  async getStudentsByCollege(collegeId?: string): Promise<any[]> {
    const query = Student.createQueryBuilder('student')
      .leftJoinAndSelect('student.college', 'college')
      .where('student.status = :status', { status: Status.ACTIVE });

    if (collegeId) {
      query.andWhere('student.collegeId = :collegeId', { collegeId });
    }

    const students = await query.getMany();
    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.id);

    const busAssignments = await StudentBusAssignment.find({
      where: { studentId: In(studentIds), status: Status.ACTIVE },
      relations: ['bus'],
    });

    const stopAssignments = await StudentStopAssignment.find({
      where: { studentId: In(studentIds), status: Status.ACTIVE },
      relations: ['stop', 'stop.route'],
    });

    const parentLinks = await ParentStudent.find({
      where: { studentId: In(studentIds) },
      relations: ['parent'],
    });

    const busMap = new Map<string, any>();
    busAssignments.forEach((b) => busMap.set(b.studentId, b.bus));

    const stopMap = new Map<string, any>();
    const routeMap = new Map<string, any>();
    stopAssignments.forEach((s) => {
      stopMap.set(s.studentId, s.stop);
      if (s.stop?.route) {
        routeMap.set(s.studentId, s.stop.route);
      }
    });

    const parentMap = new Map<string, any[]>();
    parentLinks.forEach((p) => {
      if (!parentMap.has(p.studentId)) {
        parentMap.set(p.studentId, []);
      }
      if (p.parent) {
        parentMap.get(p.studentId)!.push(p.parent);
      }
    });

    return students.map((student) => ({
      ...student,
      assignedBus: busMap.get(student.id) || null,
      assignedStop: stopMap.get(student.id) || null,
      assignedRoute: routeMap.get(student.id) || null,
      parents: parentMap.get(student.id) || [],
    }));
  }

  async getStudentById(id: string, tenantCollegeId?: string): Promise<any> {
    const student = await Student.findOne({
      where: { id },
      relations: ['college'],
    });
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (tenantCollegeId && student.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access student outside your authorized college scope');
    }

    const busAssign = await StudentBusAssignment.findOne({
      where: { studentId: id, status: Status.ACTIVE },
      relations: ['bus'],
    });

    const stopAssign = await StudentStopAssignment.findOne({
      where: { studentId: id, status: Status.ACTIVE },
      relations: ['stop', 'stop.route'],
    });

    const parentLinks = await ParentStudent.find({
      where: { studentId: id },
      relations: ['parent'],
    });

    return {
      ...student,
      assignedBus: busAssign?.bus || null,
      assignedStop: stopAssign?.stop || null,
      assignedRoute: stopAssign?.stop?.route || null,
      parents: parentLinks.map((pl) => pl.parent).filter(Boolean),
    };
  }

  async createStudent(dto: CreateStudentDTO): Promise<Student> {
    const student = new Student();
    student.collegeId = dto.collegeId;
    student.name = dto.name;
    if (dto.rollNumber) student.rollNumber = dto.rollNumber;
    if (dto.className) student.className = dto.className;
    if (dto.section) student.section = dto.section;
    if (dto.contact) student.contact = dto.contact;
    if (dto.address) student.address = dto.address;
    student.status = Status.ACTIVE;

    return await student.save();
  }

  async updateStudent(id: string, dto: UpdateStudentDTO, tenantCollegeId?: string): Promise<Student> {
    const student = await Student.findOne({ where: { id } });
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (tenantCollegeId && student.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot modify student outside your authorized college scope');
    }

    if (dto.name !== undefined) student.name = dto.name;
    if (dto.rollNumber !== undefined) student.rollNumber = dto.rollNumber;
    if (dto.className !== undefined) student.className = dto.className;
    if (dto.section !== undefined) student.section = dto.section;
    if (dto.contact !== undefined) student.contact = dto.contact;
    if (dto.address !== undefined) student.address = dto.address;
    if (dto.status !== undefined) student.status = dto.status;

    return await student.save();
  }

  async deleteStudent(id: string, tenantCollegeId?: string): Promise<void> {
    const student = await Student.findOne({ where: { id } });
    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (tenantCollegeId && student.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot delete student outside your authorized college scope');
    }

    student.status = Status.INACTIVE;
    await student.save();
  }

  async assignBusToStudent(dto: AssignStudentBusDTO, tenantCollegeId?: string): Promise<StudentBusAssignment | null> {
    if (tenantCollegeId && dto.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot assign bus outside your authorized college scope');
    }

    const busId = normalizeUuid(dto.busId);

    return await AppDataSource.transaction(async (manager) => {
      const student = await manager.findOne(Student, { where: { id: dto.studentId } });
      if (!student) throw AppError.notFound('Student not found');
      if (tenantCollegeId && student.collegeId !== tenantCollegeId) {
        throw AppError.forbidden('Cannot assign bus to student outside your authorized college scope');
      }

      await manager.update(
        StudentBusAssignment,
        { studentId: dto.studentId, status: Status.ACTIVE },
        { status: Status.INACTIVE }
      );

      if (!busId) {
        return null;
      }

      const bus = await manager.findOne(Bus, { where: { id: busId } });
      if (!bus) throw AppError.notFound('Bus not found');
      if (bus.collegeId !== student.collegeId) {
        throw AppError.forbidden('Cannot assign bus from another college to this student');
      }

      const assignment = manager.create(StudentBusAssignment, {
        studentId: dto.studentId,
        busId: busId,
        collegeId: dto.collegeId,
        status: Status.ACTIVE,
      });

      return await manager.save(assignment);
    });
  }

  async assignStopToStudent(dto: AssignStudentStopDTO, tenantCollegeId?: string): Promise<StudentStopAssignment | null> {
    if (tenantCollegeId && dto.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot assign stop outside your authorized college scope');
    }

    const stopId = normalizeUuid(dto.stopId);

    return await AppDataSource.transaction(async (manager) => {
      const student = await manager.findOne(Student, { where: { id: dto.studentId } });
      if (!student) throw AppError.notFound('Student not found');
      if (tenantCollegeId && student.collegeId !== tenantCollegeId) {
        throw AppError.forbidden('Cannot assign stop to student outside your authorized college scope');
      }

      await manager.update(
        StudentStopAssignment,
        { studentId: dto.studentId, status: Status.ACTIVE },
        { status: Status.INACTIVE }
      );

      if (!stopId) {
        return null;
      }

      const stop = await manager.findOne(RouteStop, { where: { id: stopId }, relations: ['route'] });
      if (!stop) throw AppError.notFound('Route stop not found');
      if (stop.route && stop.route.collegeId !== student.collegeId) {
        throw AppError.forbidden('Cannot assign route stop from another college to this student');
      }

      const assignment = manager.create(StudentStopAssignment, {
        studentId: dto.studentId,
        stopId: stopId,
        collegeId: dto.collegeId,
        assignmentType: dto.assignmentType || AssignmentType.BOTH,
        status: Status.ACTIVE,
      });

      return await manager.save(assignment);
    });
  }
}
