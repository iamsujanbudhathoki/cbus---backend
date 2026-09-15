import { singleton } from 'tsyringe';
import { BusStatus, TrackingStatus } from '../types/enums';

export interface BusLocationState {
  busId: string;
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

// In-memory fallback tracking store for local development without live Firebase credentials
const inMemoryLocationStore = new Map<string, BusLocationState>();

@singleton()
export class FirebaseService {
  private db: any = null;

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        const databaseURL = process.env.FIREBASE_DATABASE_URL;
        if (databaseURL) {
          admin.initializeApp({
            databaseURL,
          });
          this.db = admin.database();
          console.log('[FirebaseService] Realtime Database initialized with URL:', databaseURL);
        } else {
          console.log('[FirebaseService] FIREBASE_DATABASE_URL not set. Operating with in-memory location fallback.');
        }
      } else {
        this.db = admin.database();
      }
    } catch (err) {
      console.warn('[FirebaseService] Firebase Admin SDK warning:', err);
    }
  }

  async updateBusLocation(
    busId: string,
    data: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      status?: BusStatus;
    }
  ): Promise<BusLocationState> {
    const timestamp = Date.now();
    const locationState: BusLocationState = {
      busId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed ?? 0,
      heading: data.heading ?? 0,
      status: data.status || BusStatus.MOVING,
      lastUpdated: timestamp,
    };

    inMemoryLocationStore.set(busId, locationState);

    if (this.db) {
      try {
        await this.db.ref(`buses/${busId}`).set(locationState);
      } catch (err) {
        console.error(`[FirebaseService] Error updating Firebase for bus ${busId}:`, err);
      }
    }

    return locationState;
  }

  async getBusLocation(busId: string): Promise<TrackingResponse | null> {
    let state: BusLocationState | null = null;

    if (this.db) {
      try {
        const snapshot = await this.db.ref(`buses/${busId}`).once('value');
        if (snapshot.exists()) {
          state = snapshot.val();
        }
      } catch (err) {
        console.error(`[FirebaseService] Error reading Firebase for bus ${busId}:`, err);
      }
    }

    if (!state) {
      state = inMemoryLocationStore.get(busId) || null;
    }

    if (!state) {
      return null;
    }

    return {
      ...state,
      trackingStatus: this.calculateTrackingStatus(state.lastUpdated, state.status),
    };
  }

  async getAllBusLocations(busIds: string[]): Promise<TrackingResponse[]> {
    const results: TrackingResponse[] = [];
    for (const busId of busIds) {
      const loc = await this.getBusLocation(busId);
      if (loc) {
        results.push(loc);
      }
    }
    return results;
  }

  private calculateTrackingStatus(lastUpdated: number, currentStatus: BusStatus): TrackingStatus {
    if (currentStatus === BusStatus.OFFLINE) return TrackingStatus.OFFLINE;

    const diffSeconds = (Date.now() - lastUpdated) / 1000;

    if (diffSeconds <= 30) {
      return TrackingStatus.LIVE;
    } else if (diffSeconds <= 120) {
      return TrackingStatus.STALE;
    } else {
      return TrackingStatus.OFFLINE;
    }
  }
}
