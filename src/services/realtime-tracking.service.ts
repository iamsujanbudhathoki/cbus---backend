import { singleton } from 'tsyringe';
import { BusStatus, TrackingStatus } from '../types/enums';

export interface BusLocationState {
  busId: string;
  collegeId?: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  status: BusStatus;
  lastUpdated: number; // Unix timestamp ms
}

export interface TrackingResponse extends BusLocationState {
  trackingStatus: TrackingStatus;
}

@singleton()
export class RealtimeTrackingService {
  private inMemoryLocationStore = new Map<string, BusLocationState>();

  updateBusLocation(
    busId: string,
    data: {
      collegeId?: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      status?: BusStatus;
    }
  ): BusLocationState {
    const timestamp = Date.now();
    const existing = this.inMemoryLocationStore.get(busId);

    const locationState: BusLocationState = {
      busId,
      collegeId: data.collegeId || existing?.collegeId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed ?? 0,
      heading: data.heading ?? 0,
      status: data.status || BusStatus.MOVING,
      lastUpdated: timestamp,
    };

    this.inMemoryLocationStore.set(busId, locationState);
    return locationState;
  }

  getBusLocation(busId: string): TrackingResponse | null {
    const state = this.inMemoryLocationStore.get(busId);
    if (!state) {
      return null;
    }

    return {
      ...state,
      trackingStatus: this.calculateTrackingStatus(state.lastUpdated, state.status),
    };
  }

  getAllBusLocations(busIds: string[]): TrackingResponse[] {
    const results: TrackingResponse[] = [];
    for (const busId of busIds) {
      const loc = this.getBusLocation(busId);
      if (loc) {
        results.push(loc);
      }
    }
    return results;
  }

  getCollegeFleetLocations(collegeId: string): TrackingResponse[] {
    const results: TrackingResponse[] = [];
    for (const state of this.inMemoryLocationStore.values()) {
      if (state.collegeId === collegeId) {
        results.push({
          ...state,
          trackingStatus: this.calculateTrackingStatus(state.lastUpdated, state.status),
        });
      }
    }
    return results;
  }

  calculateTrackingStatus(lastUpdated: number, currentStatus: BusStatus): TrackingStatus {
    if (currentStatus === BusStatus.OFFLINE) return TrackingStatus.OFFLINE;

    const diffSeconds = (Date.now() - lastUpdated) / 1000;

    if (diffSeconds <= 120 || currentStatus === BusStatus.MOVING) {
      if (diffSeconds > 600) return TrackingStatus.STALE;
      return TrackingStatus.LIVE;
    } else if (diffSeconds <= 600) {
      return TrackingStatus.STALE;
    } else {
      return TrackingStatus.OFFLINE;
    }
  }

  setBusOffline(busId: string): void {
    const state = this.inMemoryLocationStore.get(busId);
    if (state) {
      state.status = BusStatus.OFFLINE;
      state.speed = 0;
      state.lastUpdated = Date.now();
      this.inMemoryLocationStore.set(busId, state);
    }
  }
}
