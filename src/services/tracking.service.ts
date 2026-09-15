import { singleton } from 'tsyringe';
import { Bus } from '../entities';
import { BusStatus, TrackingStatus } from '../types/enums';
import { FirebaseService, TrackingResponse } from './firebase.service';
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
    private firebaseService: FirebaseService,
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

    // Sync state to Firebase Realtime Database
    const locationState = await this.firebaseService.updateBusLocation(dto.busId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed,
      heading: dto.heading,
      status: currentStatus,
    });

    const trackingStatus = (await this.firebaseService.getBusLocation(dto.busId))?.trackingStatus || TrackingStatus.LIVE;

    return {
      ...locationState,
      trackingStatus,
    };
  }

  async getBusTracking(busId: string): Promise<any> {
    const bus = await this.busService.getBusById(busId);
    if (!bus) throw AppError.notFound('Bus not found');

    const tracking = await this.firebaseService.getBusLocation(busId);

    return {
      bus,
      tracking: tracking || {
        busId,
        latitude: 27.7172,
        longitude: 85.324,
        speed: 0,
        heading: 0,
        status: bus.status || BusStatus.IDLE,
        lastUpdated: Date.now(),
        trackingStatus: TrackingStatus.OFFLINE,
      },
    };
  }

  async getCollegeFleetTracking(collegeId?: string): Promise<any[]> {
    return await this.busService.getBusesByCollege(collegeId);
  }
}
