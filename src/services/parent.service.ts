import { singleton } from 'tsyringe';
import { Parent, ParentStudent, Student, User } from '../entities';
import { Role, Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { StudentService } from './student.service';
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
  studentId: string;
  relationship?: string;
}

@singleton()
export class ParentService {
  constructor(private studentService: StudentService) {}

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
        for (const studentId of dto.studentIds) {
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

  async linkStudent(dto: LinkStudentDTO): Promise<ParentStudent> {
    const parent = await Parent.findOne({ where: { id: dto.parentId } });
    if (!parent) throw AppError.notFound('Parent not found');

    const student = await Student.findOne({ where: { id: dto.studentId } });
    if (!student) throw AppError.notFound('Student not found');

    if (parent.collegeId !== student.collegeId) {
      throw AppError.forbidden('Cannot link student from a different college to this parent');
    }

    const existing = await ParentStudent.findOne({
      where: { parentId: dto.parentId, studentId: dto.studentId },
    });
    if (existing) return existing;

    const link = new ParentStudent();
    link.parentId = dto.parentId;
    link.studentId = dto.studentId;
    link.relationship = dto.relationship || 'Guardian';

    return await link.save();
  }

  async getParentByUserId(userId: string): Promise<any | null> {
    const parent = await Parent.findOne({ where: { userId } });
    if (!parent) return null;
    return await this.getParentById(parent.id);
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
        await manager.delete(ParentStudent, { parentId: id });
        for (const studentId of dto.studentIds) {
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
