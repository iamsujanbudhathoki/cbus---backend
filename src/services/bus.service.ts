import { singleton } from 'tsyringe';
import { Bus, BusRouteAssignment, Driver, Route } from '../entities';
import { BusStatus, Status, TrackingStatus, TripType } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { RealtimeTrackingService } from './realtime-tracking.service';
import { AppDataSource } from '../config/database.config';
import { In } from 'typeorm';

export interface CreateBusDTO {
  collegeId: string;
  busNumber: string;
  vehicleNumber: string;
  capacity?: number;
  driverId?: string;
}

export interface UpdateBusDTO {
  busNumber?: string;
  vehicleNumber?: string;
  capacity?: number;
  driverId?: string;
  status?: BusStatus;
  isActive?: boolean;
}

export interface AssignBusRouteDTO {
  busId: string;
  routeId: string;
  collegeId: string;
  tripType?: TripType;
}

function normalizeUuid(id?: string | null): string | null {
  if (!id || id === 'none' || id === 'unassigned' || id.trim() === '' || id === 'null' || id === 'undefined') {
    return null;
  }
  return id.trim();
}

@singleton()
export class BusService {
  constructor(private realtimeTrackingService: RealtimeTrackingService) {}

  async getBusesByCollege(collegeId?: string): Promise<any[]> {
    const query = Bus.createQueryBuilder('bus')
      .leftJoinAndSelect('bus.driver', 'driver')
      .leftJoinAndSelect('bus.college', 'college')
      .where('bus.isActive = :isActive', { isActive: true });

    if (collegeId) {
      query.andWhere('bus.collegeId = :collegeId', { collegeId });
    }

    const buses = await query.getMany();
    if (buses.length === 0) return [];

    const busIds = buses.map((b) => b.id);

    const assignments = await BusRouteAssignment.find({
      where: { busId: In(busIds), status: Status.ACTIVE },
      relations: ['route', 'route.stops'],
    });

    const assignmentMap = new Map<string, any>();
    assignments.forEach((assign) => {
      assignmentMap.set(assign.busId, assign.route);
    });

    const trackingMap = new Map<string, any>();
    buses.forEach((bus) => {
      const tracking = this.realtimeTrackingService.getBusLocation(bus.id);
      if (tracking) {
        trackingMap.set(bus.id, tracking);
      }
    });

    return buses.map((bus) => ({
      ...bus,
      assignedRoute: assignmentMap.get(bus.id) || null,
      tracking: trackingMap.get(bus.id) || null,
    }));
  }

  async getBusById(id: string, tenantCollegeId?: string): Promise<any> {
    const bus = await Bus.findOne({
      where: { id },
      relations: ['driver', 'college'],
    });
    if (!bus) {
      throw AppError.notFound('Bus not found');
    }

    if (tenantCollegeId && bus.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access bus outside your authorized college scope');
    }

    const routeAssignment = await BusRouteAssignment.findOne({
      where: { busId: bus.id, status: Status.ACTIVE },
      relations: ['route', 'route.stops'],
    });

    const tracking = this.realtimeTrackingService.getBusLocation(bus.id) || null;

    return {
      ...bus,
      assignedRoute: routeAssignment?.route || null,
      tracking,
    };
  }

  async createBus(dto: CreateBusDTO): Promise<Bus> {
    const existingBus = await Bus.findOne({
      where: { collegeId: dto.collegeId, busNumber: dto.busNumber },
    });
    if (existingBus) {
      throw AppError.conflict('Bus number already exists in this college');
    }

    const driverId = normalizeUuid(dto.driverId);
    if (driverId) {
      const driver = await Driver.findOne({ where: { id: driverId } });
      if (!driver) throw AppError.notFound('Driver not found');
      if (driver.collegeId !== dto.collegeId) {
        throw AppError.forbidden('Cannot assign driver from another college to this bus');
      }
      const busyBus = await Bus.findOne({
        where: { driverId, isActive: true },
      });
      if (busyBus) {
        throw AppError.conflict('This driver is already assigned to another active bus.');
      }
    }

    const bus = new Bus();
    bus.collegeId = dto.collegeId;
    bus.busNumber = dto.busNumber;
    bus.vehicleNumber = dto.vehicleNumber;
    bus.capacity = dto.capacity || 40;
    bus.driverId = driverId || undefined;
    bus.status = BusStatus.IDLE;
    bus.isActive = true;

    return await bus.save();
  }

  async updateBus(id: string, dto: UpdateBusDTO, tenantCollegeId?: string): Promise<Bus> {
    const bus = await Bus.findOne({ where: { id } });
    if (!bus) {
      throw AppError.notFound('Bus not found');
    }

    if (tenantCollegeId && bus.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot modify bus outside your authorized college scope');
    }

    if (dto.driverId !== undefined) {
      const driverId = normalizeUuid(dto.driverId);
      if (driverId && driverId !== bus.driverId) {
        const driver = await Driver.findOne({ where: { id: driverId } });
        if (!driver) throw AppError.notFound('Driver not found');
        if (driver.collegeId !== bus.collegeId) {
          throw AppError.forbidden('Cannot assign driver from another college to this bus');
        }
        const busyBus = await Bus.findOne({
          where: { driverId, isActive: true },
        });
        if (busyBus && busyBus.id !== bus.id) {
          throw AppError.conflict('This driver is already assigned to another active bus.');
        }
      }
      bus.driverId = driverId || (null as any);
    }

    if (dto.busNumber !== undefined) bus.busNumber = dto.busNumber;
    if (dto.vehicleNumber !== undefined) bus.vehicleNumber = dto.vehicleNumber;
    if (dto.capacity !== undefined) bus.capacity = dto.capacity;
    if (dto.status !== undefined) bus.status = dto.status;
    if (dto.isActive !== undefined) bus.isActive = dto.isActive;

    return await bus.save();
  }

  async deleteBus(id: string, tenantCollegeId?: string): Promise<void> {
    const bus = await Bus.findOne({ where: { id } });
    if (!bus) {
      throw AppError.notFound('Bus not found');
    }

    if (tenantCollegeId && bus.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot delete bus outside your authorized college scope');
    }

    bus.isActive = false;
    await bus.save();
  }

  async assignDriver(busId: string, driverId?: string, tenantCollegeId?: string): Promise<Bus> {
    const bus = await Bus.findOne({ where: { id: busId } });
    if (!bus) {
      throw AppError.notFound('Bus not found');
    }

    if (tenantCollegeId && bus.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot assign driver to bus outside your authorized college scope');
    }

    const normalizedDriverId = normalizeUuid(driverId);
    if (normalizedDriverId) {
      const driver = await Driver.findOne({ where: { id: normalizedDriverId } });
      if (!driver) throw AppError.notFound('Driver not found');
      if (driver.collegeId !== bus.collegeId) {
        throw AppError.forbidden('Cannot assign driver from another college to this bus');
      }
      const busyBus = await Bus.findOne({
        where: { driverId: normalizedDriverId, isActive: true },
      });
      if (busyBus && busyBus.id !== bus.id) {
        throw AppError.conflict('This driver is already assigned to another active bus.');
      }
    }

    bus.driverId = normalizedDriverId || (null as any);
    const savedBus = await bus.save();

    return await Bus.findOne({
      where: { id: savedBus.id },
      relations: ['driver', 'college'],
    }) as Bus;
  }

  async assignRouteToBus(dto: AssignBusRouteDTO, tenantCollegeId?: string): Promise<BusRouteAssignment | null> {
    if (tenantCollegeId && dto.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot assign route outside your authorized college scope');
    }

    const routeId = normalizeUuid(dto.routeId);

    return await AppDataSource.transaction(async (manager) => {
      const bus = await manager.findOne(Bus, { where: { id: dto.busId } });
      if (!bus) throw AppError.notFound('Bus not found');
      if (tenantCollegeId && bus.collegeId !== tenantCollegeId) {
        throw AppError.forbidden('Cannot assign route to bus outside your authorized college scope');
      }

      await manager.update(
        BusRouteAssignment,
        { busId: dto.busId, status: Status.ACTIVE },
        { status: Status.INACTIVE }
      );

      if (!routeId) {
        return null;
      }

      const route = await manager.findOne(Route, { where: { id: routeId } });
      if (!route) throw AppError.notFound('Route not found');
      if (route.collegeId !== bus.collegeId) {
        throw AppError.forbidden('Cannot assign route from another college to this bus');
      }

      const assignment = manager.create(BusRouteAssignment, {
        busId: dto.busId,
        routeId: routeId,
        collegeId: dto.collegeId,
        tripType: dto.tripType || TripType.MORNING,
        status: Status.ACTIVE,
      });

      return await manager.save(assignment);
    });
  }
}
