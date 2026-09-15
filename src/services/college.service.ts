import { singleton } from 'tsyringe';
import { Bus, College, Route, Student, User } from '../entities';
import { BusStatus, Role, Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { AppDataSource } from '../config/database.config';

export interface CreateCollegeDTO {
  name: string;
  code: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}

export interface UpdateCollegeDTO {
  name?: string;
  code?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: Status;
}

@singleton()
export class CollegeService {
  async getAllColleges(): Promise<College[]> {
    return await College.find({ order: { name: 'ASC' } });
  }

  async getCollegeById(id: string): Promise<College | null> {
    return await College.findOne({ where: { id } });
  }

  async createCollege(dto: CreateCollegeDTO): Promise<{ college: College; admin?: User }> {
    return await AppDataSource.transaction(async (manager) => {
      const existingCode = await manager.findOne(College, {
        where: { code: dto.code.toUpperCase().trim() },
      });
      if (existingCode) {
        throw AppError.conflict(`College code ${dto.code} is already in use`);
      }

      const college = manager.create(College, {
        name: dto.name,
        code: dto.code.toUpperCase().trim(),
        address: dto.address || '',
        contactPhone: dto.contactPhone || '',
        contactEmail: dto.contactEmail || '',
        status: Status.ACTIVE,
      });

      const savedCollege = await manager.save(college);

      let adminUser: User | undefined = undefined;
      if (dto.adminEmail && dto.adminPassword && dto.adminName) {
        const existingUser = await manager.findOne(User, {
          where: { email: dto.adminEmail.toLowerCase().trim() },
        });
        if (existingUser) {
          throw AppError.conflict('Admin email is already registered');
        }

        adminUser = manager.create(User, {
          email: dto.adminEmail.toLowerCase().trim(),
          password: dto.adminPassword,
          name: dto.adminName,
          role: Role.COLLEGE,
          collegeId: savedCollege.id,
          status: Status.ACTIVE,
        });
        await manager.save(adminUser);
      }

      return { college: savedCollege, admin: adminUser };
    });
  }

  async updateCollege(id: string, dto: UpdateCollegeDTO): Promise<College> {
    const college = await College.findOne({ where: { id } });
    if (!college) {
      throw AppError.notFound('College not found');
    }

    if (dto.name) college.name = dto.name;
    if (dto.code) college.code = dto.code.toUpperCase().trim();
    if (dto.address !== undefined) college.address = dto.address;
    if (dto.contactPhone !== undefined) college.contactPhone = dto.contactPhone;
    if (dto.contactEmail !== undefined) college.contactEmail = dto.contactEmail;
    if (dto.status) college.status = dto.status;

    return await college.save();
  }

  async deleteCollege(id: string): Promise<boolean> {
    const college = await College.findOne({ where: { id } });
    if (!college) {
      throw AppError.notFound('College not found');
    }
    college.status = Status.DEACTIVATED;
    await college.save();
    return true;
  }

  async getPlatformMetrics() {
    const totalColleges = await College.count({ where: { status: Status.ACTIVE } });
    const totalStudents = await Student.count({ where: { status: Status.ACTIVE } });
    const totalBuses = await Bus.count({ where: { isActive: true } });
    const activeBuses = await Bus.count({ where: { isActive: true, status: BusStatus.MOVING } });
    const offlineBuses = await Bus.count({ where: { isActive: true, status: BusStatus.OFFLINE } });
    const totalRoutes = await Route.count({ where: { status: Status.ACTIVE } });

    return {
      totalColleges,
      totalStudents,
      totalBuses,
      activeBuses,
      offlineBuses,
      totalRoutes,
    };
  }

  async getCollegeMetrics(collegeId: string) {
    const totalStudents = await Student.count({ where: { collegeId, status: Status.ACTIVE } });
    const totalBuses = await Bus.count({ where: { collegeId, isActive: true } });
    const activeBuses = await Bus.count({ where: { collegeId, isActive: true, status: BusStatus.MOVING } });
    const offlineBuses = await Bus.count({ where: { collegeId, isActive: true, status: BusStatus.OFFLINE } });
    const totalRoutes = await Route.count({ where: { collegeId, status: Status.ACTIVE } });

    return {
      totalStudents,
      totalBuses,
      activeBuses,
      offlineBuses,
      totalRoutes,
    };
  }
}
