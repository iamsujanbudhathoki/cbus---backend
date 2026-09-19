import { singleton } from 'tsyringe';
import { Bus, BusRouteAssignment, Driver, DriverShift } from '../entities';
import { BusStatus, ShiftStatus, Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { AppDataSource } from '../config/database.config';

import { RealtimeTrackingService } from './realtime-tracking.service';
import { SocketService } from './socket.service';

export interface StartShiftDTO {
  notes?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
}

export interface UpdateNotesDTO {
  notes: string;
}

@singleton()
export class DriverShiftService {
  constructor(
    private realtimeTrackingService: RealtimeTrackingService,
    private socketService: SocketService
  ) {}

  async getDriverPortal(userId: string): Promise<any> {
    const driver = await Driver.findOne({ where: { userId } });
    if (!driver) {
      throw AppError.notFound('Driver profile not found for logged in user.');
    }

    const bus = await Bus.findOne({
      where: { driverId: driver.id, isActive: true },
    });

    let route: any = null;
    if (bus) {
      const routeAssignment = await BusRouteAssignment.findOne({
        where: { busId: bus.id, status: Status.ACTIVE },
        relations: ['route', 'route.stops'],
      });
      if (routeAssignment) {
        route = routeAssignment.route;
      }
    }

    const activeShift = await DriverShift.findOne({
      where: { driverId: driver.id, status: ShiftStatus.RUNNING },
    });

    return {
      driver,
      bus: bus || null,
      route: route || null,
      activeShift: activeShift || null,
    };
  }

  async startShift(userId: string, dto?: StartShiftDTO): Promise<DriverShift> {
    const savedShift = await AppDataSource.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, { where: { userId } });
      if (!driver) throw AppError.notFound('Driver profile not found');

      // Business Rule 1: A driver cannot have multiple active shifts simultaneously
      const existingRunning = await manager.findOne(DriverShift, {
        where: { driverId: driver.id, status: ShiftStatus.RUNNING },
      });
      if (existingRunning) {
        throw AppError.conflict('You already have an active shift in progress.');
      }

      // Business Rule 2: Driver must have a valid assigned bus before starting a shift
      const bus = await manager.findOne(Bus, {
        where: { driverId: driver.id, isActive: true },
      });
      if (!bus) {
        throw AppError.badRequest('No bus is currently assigned to your driver account. Please contact college admin.');
      }

      const routeAssignment = await manager.findOne(BusRouteAssignment, {
        where: { busId: bus.id, status: Status.ACTIVE },
        relations: ['route'],
      });

      const shift = manager.create(DriverShift, {
        collegeId: driver.collegeId,
        driverId: driver.id,
        busId: bus.id,
        routeId: routeAssignment ? routeAssignment.routeId : undefined,
        busNumberSnap: bus.busNumber,
        vehicleNumberSnap: bus.vehicleNumber,
        routeNameSnap: routeAssignment?.route?.name || 'Unassigned Route',
        startedAt: new Date(),
        status: ShiftStatus.RUNNING,
        notes: dto?.notes || '',
      });

      const result = await manager.save(shift);

      // Update bus status to MOVING while shift is active
      bus.status = BusStatus.MOVING;
      await manager.save(bus);

      return result;
    });

    // If driver provided real coordinates at shift start, update and broadcast
    if (typeof dto?.latitude === 'number' && typeof dto?.longitude === 'number') {
      const locationState = this.realtimeTrackingService.updateBusLocation(savedShift.busId, {
        collegeId: savedShift.collegeId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        speed: dto.speed ?? 0,
        status: BusStatus.MOVING,
      });
      this.socketService.broadcastBusLocation(savedShift.collegeId, savedShift.busId, {
        ...locationState,
        trackingStatus: this.realtimeTrackingService.calculateTrackingStatus(locationState.lastUpdated, locationState.status),
      });
    }

    // Broadcast status change to MOVING
    this.socketService.broadcastBusStatus(savedShift.collegeId, savedShift.busId, BusStatus.MOVING);

    return savedShift;
  }

  async updateShiftNotes(userId: string, shiftId: string, notes: string): Promise<DriverShift> {
    const driver = await Driver.findOne({ where: { userId } });
    if (!driver) throw AppError.notFound('Driver profile not found');

    const shift = await DriverShift.findOne({ where: { id: shiftId } });
    if (!shift) throw AppError.notFound('Shift not found');

    if (shift.driverId !== driver.id) {
      throw AppError.forbidden('Unauthorized to update this shift');
    }

    if (shift.status !== ShiftStatus.RUNNING) {
      throw AppError.badRequest('Notes can only be edited on active running shifts');
    }

    shift.notes = notes;
    return await shift.save();
  }

  async endShift(userId: string, shiftId: string): Promise<DriverShift> {
    const savedShift = await AppDataSource.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, { where: { userId } });
      if (!driver) throw AppError.notFound('Driver profile not found');

      const shift = await manager.findOne(DriverShift, { where: { id: shiftId } });
      if (!shift) throw AppError.notFound('Shift record not found');

      if (shift.driverId !== driver.id) {
        throw AppError.forbidden('Unauthorized to end this shift');
      }

      if (shift.status !== ShiftStatus.RUNNING) {
        throw AppError.badRequest('Shift is not currently active or already completed.');
      }

      const endedAt = new Date(); // Server-side timestamp
      const startedAt = new Date(shift.startedAt);
      const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

      shift.endedAt = endedAt;
      shift.durationSeconds = durationSeconds;
      shift.status = ShiftStatus.COMPLETED;

      const result = await manager.save(shift);

      // Update bus status back to IDLE
      const bus = await manager.findOne(Bus, { where: { id: shift.busId } });
      if (bus) {
        bus.status = BusStatus.IDLE;
        await manager.save(bus);
      }

      return result;
    });

    // Sync ended offline state to Realtime Tracking Store and broadcast via WebSockets
    this.realtimeTrackingService.setBusOffline(savedShift.busId);
    this.socketService.broadcastBusStatus(savedShift.collegeId, savedShift.busId, BusStatus.OFFLINE);

    return savedShift;
  }

  async getDriverHistory(userId: string, range?: string): Promise<DriverShift[]> {
    const driver = await Driver.findOne({ where: { userId } });
    if (!driver) throw AppError.notFound('Driver profile not found');

    const shifts = await DriverShift.find({
      where: { driverId: driver.id },
      order: { startedAt: 'DESC' },
    });

    if (!range || range === 'all') return shifts;

    const now = new Date();
    return shifts.filter((s) => {
      const sDate = new Date(s.startedAt);
      if (range === 'today') {
        return sDate.toDateString() === now.toDateString();
      }
      if (range === 'week') {
        const diffDays = (now.getTime() - sDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      }
      if (range === 'month') {
        const diffDays = (now.getTime() - sDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30;
      }
      return true;
    });
  }

  async getAdminShifts(collegeId?: string, driverId?: string): Promise<DriverShift[]> {
    const query = DriverShift.createQueryBuilder('shift')
      .leftJoinAndSelect('shift.driver', 'driver')
      .leftJoinAndSelect('shift.bus', 'bus')
      .leftJoinAndSelect('shift.route', 'route');

    if (collegeId) {
      query.andWhere('shift.collegeId = :collegeId', { collegeId });
    }

    if (driverId) {
      query.andWhere('shift.driverId = :driverId', { driverId });
    }

    return await query.orderBy('shift.startedAt', 'DESC').getMany();
  }
}
