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

function withTimeout<T>(promise: Promise<T>, ms: number = 1500): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

@singleton()
export class FirebaseService {
  private db: any = null;

  constructor() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const admin = require('firebase-admin');
      const { getDatabase } = require('firebase-admin/database');
      const apps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);
      const databaseURL = process.env.FIREBASE_DATABASE_URL;

      if (!apps.length) {
        if (databaseURL) {
          const app = admin.initializeApp({
            databaseURL,
          });
          this.db = getDatabase(app);
          console.log('[FirebaseService] Realtime Database initialized with URL:', databaseURL);
        } else {
          console.log('[FirebaseService] FIREBASE_DATABASE_URL not set. Operating with in-memory location fallback.');
        }
      } else {
        this.db = getDatabase(apps[0]);
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

    // Push to Firebase asynchronously in background without blocking API response
    (async () => {
      if (this.db) {
        try {
          await withTimeout(this.db.ref(`buses/${busId}`).set(locationState), 1500);
        } catch (err) {
          console.error(`[FirebaseService] Error updating Firebase via admin SDK for bus ${busId}:`, err);
        }
      }

      const databaseURL = process.env.FIREBASE_DATABASE_URL;
      if (databaseURL) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1500);
          await fetch(`${databaseURL}/buses/${busId}.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locationState),
            signal: controller.signal,
          });
          clearTimeout(timer);
        } catch (restErr) {
          // Silent REST catch
        }
      }
    })();

    return locationState;
  }

  async getBusLocation(busId: string): Promise<TrackingResponse | null> {
    let state: BusLocationState | null = null;

    if (this.db) {
      try {
        const snapshot: any = await withTimeout(this.db.ref(`buses/${busId}`).once('value'), 1500);
        if (snapshot && typeof snapshot.exists === 'function' && snapshot.exists()) {
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

    if (diffSeconds <= 120 || currentStatus === BusStatus.MOVING) {
      if (diffSeconds > 600) return TrackingStatus.STALE;
      return TrackingStatus.LIVE;
    } else if (diffSeconds <= 600) {
      return TrackingStatus.STALE;
    } else {
      return TrackingStatus.OFFLINE;
    }
  }
}
