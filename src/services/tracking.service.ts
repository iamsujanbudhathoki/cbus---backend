import { singleton } from 'tsyringe';
import { Bus } from '../entities';
import { BusStatus, TrackingStatus } from '../types/enums';
import { RealtimeTrackingService, TrackingResponse } from './realtime-tracking.service';
import { SocketService } from './socket.service';
import { BusService } from './bus.service';
import { AppError } from '../utils/appError.util';

export interface LocationUpdateDTO {
  busId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  status?: BusStatus;
}

@singleton()
export class TrackingService {
  constructor(
    private realtimeTrackingService: RealtimeTrackingService,
    private socketService: SocketService,
    private busService: BusService
  ) {}

  async updateLocation(dto: LocationUpdateDTO): Promise<TrackingResponse> {
    const bus = await Bus.findOne({ where: { id: dto.busId } });
    if (!bus) {
      throw AppError.notFound(`Bus with ID ${dto.busId} not found`);
    }

    const currentStatus = dto.status || BusStatus.MOVING;

    // Update database status if changed
    if (bus.status !== currentStatus) {
      bus.status = currentStatus;
      await bus.save();
    }

    // Update live state in realtime tracking store
    const locationState = this.realtimeTrackingService.updateBusLocation(dto.busId, {
      collegeId: bus.collegeId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      status: currentStatus,
    });

    const trackingStatus = this.realtimeTrackingService.calculateTrackingStatus(
      locationState.lastUpdated,
      locationState.status
    );

    const trackingResponse: TrackingResponse = {
      ...locationState,
      trackingStatus,
    };

    // Broadcast over WebSockets to both college and bus rooms
    this.socketService.broadcastBusLocation(bus.collegeId, dto.busId, trackingResponse);

    return trackingResponse;
  }

  async getBusTracking(busId: string): Promise<any> {
    const bus = await this.busService.getBusById(busId);
    if (!bus) throw AppError.notFound('Bus not found');

    const tracking = this.realtimeTrackingService.getBusLocation(busId);

    return {
      bus,
      tracking: tracking || null,
    };
  }

  async getBusLiveLocation(busId: string, tenantCollegeId?: string): Promise<any> {
    const bus = await Bus.findOne({ where: { id: busId, isActive: true } });
    if (!bus) {
      throw AppError.notFound('Bus not found');
    }

    if (tenantCollegeId && bus.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access bus location outside your authorized college scope');
    }

    const tracking = this.realtimeTrackingService.getBusLocation(busId);

    return {
      busId: bus.id,
      busNumber: bus.busNumber,
      vehicleNumber: bus.vehicleNumber,
      collegeId: bus.collegeId,
      latitude: tracking?.latitude ?? null,
      longitude: tracking?.longitude ?? null,
      speed: tracking?.speed ?? 0,
      heading: tracking?.heading ?? 0,
      status: tracking?.status || bus.status,
      trackingStatus: tracking?.trackingStatus || (bus.status === BusStatus.MOVING ? TrackingStatus.LIVE : TrackingStatus.OFFLINE),
      lastUpdated: tracking?.lastUpdated || null,
    };
  }

  async getCollegeFleetTracking(collegeId?: string): Promise<any[]> {
    return await this.busService.getBusesByCollege(collegeId);
  }
}
