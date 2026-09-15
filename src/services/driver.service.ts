import { singleton } from 'tsyringe';
import { Driver, User } from '../entities';
import { Role, Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { AppDataSource } from '../config/database.config';

export interface CreateDriverDTO {
  collegeId: string;
  name: string;
  phone: string;
  licenseNumber?: string;
  email?: string;
  password?: string;
}

export interface UpdateDriverDTO {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  status?: Status;
}

@singleton()
export class DriverService {
  async getDriversByCollege(collegeId?: string): Promise<Driver[]> {
    const query = Driver.createQueryBuilder('driver')
      .where('driver.status != :status', { status: Status.DEACTIVATED });

    if (collegeId) {
      query.andWhere('driver.collegeId = :collegeId', { collegeId });
    }

    return await query.orderBy('driver.name', 'ASC').getMany();
  }

  async getDriverById(id: string, tenantCollegeId?: string): Promise<Driver | null> {
    const driver = await Driver.findOne({ where: { id } });
    if (!driver) return null;
    if (tenantCollegeId && driver.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access data outside your authorized college scope');
    }
    return driver;
  }

  async createDriver(dto: CreateDriverDTO): Promise<Driver> {
    return await AppDataSource.transaction(async (manager) => {
      let user: User | null = null;
      if (dto.email && dto.password) {
        const existing = await manager.findOne(User, {
          where: { email: dto.email.toLowerCase().trim() },
        });
        if (existing) {
          throw AppError.conflict('Email is already registered');
        }

        user = manager.create(User, {
          email: dto.email.toLowerCase().trim(),
          password: dto.password,
          name: dto.name,
          phoneNumber: dto.phone,
          role: Role.DRIVER,
          collegeId: dto.collegeId,
          status: Status.ACTIVE,
        });
        await manager.save(user);
      }

      const driver = manager.create(Driver, {
        collegeId: dto.collegeId,
        userId: user ? user.id : undefined,
        name: dto.name,
        phone: dto.phone,
        licenseNumber: dto.licenseNumber || '',
        status: Status.ACTIVE,
      });

      return await manager.save(driver);
    });
  }

  async updateDriver(id: string, dto: UpdateDriverDTO, tenantCollegeId?: string): Promise<Driver> {
    const driver = await Driver.findOne({ where: { id } });
    if (!driver) throw AppError.notFound('Driver not found');
    if (tenantCollegeId && driver.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot modify driver outside your authorized college scope');
    }

    if (dto.name !== undefined) driver.name = dto.name;
    if (dto.phone !== undefined) driver.phone = dto.phone;
    if (dto.licenseNumber !== undefined) driver.licenseNumber = dto.licenseNumber;
    if (dto.status !== undefined) driver.status = dto.status;

    return await driver.save();
  }

  async deleteDriver(id: string, tenantCollegeId?: string): Promise<boolean> {
    const driver = await Driver.findOne({ where: { id } });
    if (!driver) throw AppError.notFound('Driver not found');
    if (tenantCollegeId && driver.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot delete driver outside your authorized college scope');
    }
    driver.status = Status.DEACTIVATED;
    await driver.save();
    return true;
  }
}
