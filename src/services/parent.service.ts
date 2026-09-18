import { singleton } from 'tsyringe';
import { Parent, ParentStudent, Student, StudentBusAssignment, User } from '../entities';
import { BusStatus, Role, Status, TrackingStatus } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { StudentService } from './student.service';
import { FirebaseService } from './firebase.service';
import { AppDataSource } from '../config/database.config';
import { In } from 'typeorm';

export interface CreateParentDTO {
  collegeId: string;
  name: string;
  phone: string;
  email?: string;
  password?: string;
  address?: string;
  studentIds?: string[];
  relationship?: string;
}

export interface UpdateParentDTO {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  studentIds?: string[];
  relationship?: string;
}

export interface LinkStudentDTO {
  parentId: string;
  studentId?: string;
  studentIds?: string[];
  relationship?: string;
}

@singleton()
export class ParentService {
  constructor(
    private studentService: StudentService,
    private firebaseService: FirebaseService
  ) {}

  async getParentsByCollege(collegeId?: string): Promise<any[]> {
    const query = Parent.createQueryBuilder('parent')
      .where('parent.status != :status', { status: Status.DEACTIVATED });

    if (collegeId) {
      query.andWhere('parent.collegeId = :collegeId', { collegeId });
    }

    const parents = await query.orderBy('parent.createdAt', 'DESC').getMany();
    if (parents.length === 0) return [];

    const parentIds = parents.map((p) => p.id);
    const allParentStudents = await ParentStudent.find({
      where: { parentId: In(parentIds) },
      relations: ['student'],
    });

    const studentsMap = new Map<string, any[]>();
    allParentStudents.forEach((ps) => {
      const existing = studentsMap.get(ps.parentId) || [];
      existing.push(ps.student);
      studentsMap.set(ps.parentId, existing);
    });

    return parents.map((parent) => ({
      ...parent,
      students: studentsMap.get(parent.id) || [],
    }));
  }

  async getParentById(id: string, tenantCollegeId?: string): Promise<any | null> {
    const parent = await Parent.findOne({ where: { id } });
    if (!parent) return null;
    if (tenantCollegeId && parent.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access data outside your authorized college scope');
    }

    const parentStudents = await ParentStudent.find({
      where: { parentId: parent.id },
      relations: ['student'],
    });

    const studentsWithTransport = [];
    for (const ps of parentStudents) {
      const studentDetails = await this.studentService.getStudentById(ps.student.id, tenantCollegeId);
      studentsWithTransport.push({
        ...studentDetails,
        relationship: ps.relationship,
      });
    }

    return {
      ...parent,
      children: studentsWithTransport,
    };
  }

  async createParent(dto: CreateParentDTO): Promise<Parent> {
    return await AppDataSource.transaction(async (manager) => {
      let user: User | null = null;

      if (dto.email && dto.password) {
        const existingUser = await manager.findOne(User, {
          where: { email: dto.email.toLowerCase().trim() },
        });
        if (existingUser) {
          throw AppError.conflict('Email is already registered');
        }

        user = manager.create(User, {
          email: dto.email.toLowerCase().trim(),
          password: dto.password,
          name: dto.name,
          phoneNumber: dto.phone,
          role: Role.PARENT,
          collegeId: dto.collegeId,
          status: Status.ACTIVE,
        });
        await manager.save(user);
      }

      const parent = manager.create(Parent, {
        collegeId: dto.collegeId,
        userId: user ? user.id : undefined,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ? dto.email.toLowerCase().trim() : undefined,
        address: dto.address || undefined,
        status: Status.ACTIVE,
      });

      const savedParent = await manager.save(parent);

      if (dto.studentIds && dto.studentIds.length > 0) {
        const uniqueStudentIds = Array.from(new Set(dto.studentIds));

        // Validate that no student is already linked to another parent
        const existingLinks = await manager.find(ParentStudent, {
          where: { studentId: In(uniqueStudentIds) },
          relations: ['student', 'parent'],
        });

        if (existingLinks.length > 0) {
          const conflicts = existingLinks.map(
            (ps) => `"${ps.student?.name || 'Student'}" (already linked to ${ps.parent?.name || 'another parent'})`
          );
          throw AppError.conflict(
            `Cannot link student(s): ${conflicts.join(', ')}. A student cannot be linked to more than one parent.`
          );
        }

        for (const studentId of uniqueStudentIds) {
          const student = await manager.findOne(Student, { where: { id: studentId } });
          if (!student) throw AppError.notFound(`Student ${studentId} not found`);
          if (student.collegeId !== dto.collegeId) {
            throw AppError.forbidden('Cannot link student from a different college to this parent');
          }
          const link = manager.create(ParentStudent, {
            parentId: savedParent.id,
            studentId,
            relationship: dto.relationship || 'Guardian',
          });
          await manager.save(link);
        }
      }

      return savedParent;
    });
  }

  async linkStudent(dto: LinkStudentDTO): Promise<any> {
    const parentId = dto.parentId;
    const rawStudentIds = dto.studentIds && dto.studentIds.length > 0
      ? dto.studentIds
      : dto.studentId
      ? [dto.studentId]
      : [];
    const targetStudentIds = Array.from(new Set(rawStudentIds));

    if (!parentId) throw AppError.badRequest('Parent ID is required');

    return await AppDataSource.transaction(async (manager) => {
      const parent = await manager.findOne(Parent, { where: { id: parentId } });
      if (!parent) throw AppError.notFound('Parent not found');

      if (targetStudentIds.length === 0) {
        // If empty selection submitted, clear links for this parent
        await manager.delete(ParentStudent, { parentId });
        return [];
      }

      // 1. Verify existence of all target students
      const students = await manager.find(Student, { where: { id: In(targetStudentIds) } });
      if (students.length !== targetStudentIds.length) {
        throw AppError.notFound('One or more selected students were not found');
      }

      // 2. Validate college match
      for (const student of students) {
        if (parent.collegeId !== student.collegeId) {
          throw AppError.forbidden(`Student "${student.name}" belongs to a different college`);
        }
      }

      // 3. Single-parent rule check: verify none of targetStudentIds are linked to ANOTHER parent
      const existingLinks = await manager.find(ParentStudent, {
        where: { studentId: In(targetStudentIds) },
        relations: ['student', 'parent'],
      });

      const conflictingLinks = existingLinks.filter((ps) => ps.parentId !== parentId);

      if (conflictingLinks.length > 0) {
        const conflictDetails = Array.from(
          new Set(
            conflictingLinks.map(
              (ps) => `"${ps.student?.name || 'Student'}" (already linked to ${ps.parent?.name || 'another parent'})`
            )
          )
        );
        throw AppError.conflict(
          `Cannot link student(s): ${conflictDetails.join(', ')}. A student cannot be linked to more than one parent.`
        );
      }

      // 4. Update parent-student relationships for this parent
      await manager.delete(ParentStudent, { parentId });

      const newLinks: ParentStudent[] = [];
      for (const studentId of targetStudentIds) {
        const link = manager.create(ParentStudent, {
          parentId,
          studentId,
          relationship: dto.relationship || 'Guardian',
        });
        const savedLink = await manager.save(link);
        newLinks.push(savedLink);
      }

      return newLinks;
    });
  }

  async getParentByUserId(userId: string): Promise<any | null> {
    const parent = await Parent.findOne({ where: { userId } });
    if (!parent) return null;
    return await this.getParentById(parent.id);
  }

  async getParentLiveLocationByUserId(userId: string, tenantCollegeId?: string): Promise<any> {
    const parent = await Parent.findOne({ where: { userId } });
    if (!parent) {
      throw AppError.notFound('Parent profile not found');
    }

    if (tenantCollegeId && parent.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access data outside your authorized college scope');
    }

    const parentStudents = await ParentStudent.find({
      where: { parentId: parent.id },
      relations: ['student'],
    });

    const busLocations = [];
    for (const ps of parentStudents) {
      if (!ps.student) continue;

      const studentBusAssign = await StudentBusAssignment.findOne({
        where: { studentId: ps.student.id, status: Status.ACTIVE },
        relations: ['bus'],
      });

      if (studentBusAssign && studentBusAssign.bus) {
        const bus = studentBusAssign.bus;
        let tracking = await this.firebaseService.getBusLocation(bus.id);
        if (!tracking) {
          tracking = {
            busId: bus.id,
            latitude: 27.7172,
            longitude: 85.324,
            speed: bus.status === BusStatus.MOVING ? 30 : 0,
            heading: 0,
            status: bus.status || BusStatus.IDLE,
            lastUpdated: Date.now(),
            trackingStatus: bus.status === BusStatus.MOVING ? TrackingStatus.LIVE : TrackingStatus.OFFLINE,
          };
        }

        busLocations.push({
          studentId: ps.student.id,
          studentName: ps.student.name,
          busId: bus.id,
          busNumber: bus.busNumber,
          vehicleNumber: bus.vehicleNumber,
          latitude: tracking.latitude,
          longitude: tracking.longitude,
          speed: tracking.speed ?? 0,
          heading: tracking.heading ?? 0,
          status: tracking.status || bus.status,
          trackingStatus: tracking.trackingStatus || TrackingStatus.OFFLINE,
          lastUpdated: tracking.lastUpdated || Date.now(),
        });
      } else {
        busLocations.push({
          studentId: ps.student.id,
          studentName: ps.student.name,
          busId: null,
          busNumber: null,
          vehicleNumber: null,
          latitude: null,
          longitude: null,
          speed: 0,
          heading: 0,
          status: BusStatus.IDLE,
          trackingStatus: TrackingStatus.OFFLINE,
          lastUpdated: null,
        });
      }
    }

    return {
      parentId: parent.id,
      collegeId: parent.collegeId,
      buses: busLocations,
    };
  }

  async updateParent(id: string, dto: UpdateParentDTO, tenantCollegeId?: string): Promise<any> {
    return await AppDataSource.transaction(async (manager) => {
      const parent = await manager.findOne(Parent, { where: { id } });
      if (!parent) throw AppError.notFound('Parent not found');
      if (tenantCollegeId && parent.collegeId !== tenantCollegeId) {
        throw AppError.forbidden('Cannot modify parent outside your authorized college scope');
      }

      if (dto.name !== undefined) parent.name = dto.name;
      if (dto.phone !== undefined) parent.phone = dto.phone;
      if (dto.email !== undefined) parent.email = dto.email;
      if (dto.address !== undefined) parent.address = dto.address;

      await manager.save(parent);

      if (parent.userId) {
        const user = await manager.findOne(User, { where: { id: parent.userId } });
        if (user) {
          if (dto.name !== undefined) user.name = dto.name;
          if (dto.phone !== undefined) user.phoneNumber = dto.phone;
          if (dto.email !== undefined) user.email = dto.email.toLowerCase().trim();
          await manager.save(user);
        }
      }

      if (dto.studentIds !== undefined) {
        const uniqueStudentIds = Array.from(new Set(dto.studentIds));

        if (uniqueStudentIds.length > 0) {
          const existingLinks = await manager.find(ParentStudent, {
            where: { studentId: In(uniqueStudentIds) },
            relations: ['student', 'parent'],
          });
          const conflicting = existingLinks.filter((ps) => ps.parentId !== id);
          if (conflicting.length > 0) {
            const conflictDetails = Array.from(
              new Set(
                conflicting.map(
                  (ps) => `"${ps.student?.name || 'Student'}" (already linked to ${ps.parent?.name || 'another parent'})`
                )
              )
            );
            throw AppError.conflict(
              `Cannot link student(s): ${conflictDetails.join(', ')}. A student cannot be linked to more than one parent.`
            );
          }
        }

        await manager.delete(ParentStudent, { parentId: id });
        for (const studentId of uniqueStudentIds) {
          const student = await manager.findOne(Student, { where: { id: studentId } });
          if (!student) throw AppError.notFound(`Student ${studentId} not found`);
          if (student.collegeId !== parent.collegeId) {
            throw AppError.forbidden('Cannot link student from a different college to this parent');
          }
          const link = manager.create(ParentStudent, {
            parentId: id,
            studentId,
            relationship: dto.relationship || 'Guardian',
          });
          await manager.save(link);
        }
      }

      return await this.getParentById(id);
    });
  }

  async deleteParent(id: string, tenantCollegeId?: string): Promise<boolean> {
    return await AppDataSource.transaction(async (manager) => {
      const parent = await manager.findOne(Parent, { where: { id } });
      if (!parent) throw AppError.notFound('Parent not found');
      if (tenantCollegeId && parent.collegeId !== tenantCollegeId) {
        throw AppError.forbidden('Cannot delete parent outside your authorized college scope');
      }

      parent.status = Status.DEACTIVATED;
      await manager.save(parent);

      if (parent.userId) {
        const user = await manager.findOne(User, { where: { id: parent.userId } });
        if (user) {
          user.status = Status.DEACTIVATED;
          await manager.save(user);
        }
      }

      return true;
    });
  }
}
