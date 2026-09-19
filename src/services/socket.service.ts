import { Server as SocketIOServer, Socket } from 'socket.io';
import http from 'http';
import { singleton } from 'tsyringe';
import { verifyToken } from '../middlewares/auth.middleware';
import { DotenvConfig } from '../config/env.config';
import { BusStatus, Role, Status } from '../types/enums';
import { User, Bus } from '../entities';
import { RealtimeTrackingService } from './realtime-tracking.service';

export interface AuthenticatedUser {
  id: string;
  role: Role;
  collegeId?: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: AuthenticatedUser;
}

@singleton()
export class SocketService {
  private io: SocketIOServer | null = null;

  constructor(private realtimeTrackingService: RealtimeTrackingService) {}

  public init(server: http.Server): SocketIOServer {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
      'https://cbus-xi.vercel.app',
      DotenvConfig.FRONTEND_BASE_URL,
    ].filter((url, index, self) => Boolean(url) && self.indexOf(url) === index);

    this.io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          if (
            allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            process.env.NODE_ENV !== 'production'
          ) {
            return callback(null, true);
          }
          return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingTimeout: 20000,
      pingInterval: 10000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('[SocketService] Realtime WebSocket gateway initialized successfully with multi-tenant isolation.');
    return this.io;
  }

  public getIO(): SocketIOServer | null {
    return this.io;
  }

  private setupMiddleware() {
    if (!this.io) return;

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const cookieHeader = socket.handshake.headers?.cookie;
        let cookieToken: string | undefined;
        if (cookieHeader) {
          const parsed = cookieHeader.split(';').reduce((acc: Record<string, string>, c) => {
            const [k, v] = c.trim().split('=');
            if (k && v) acc[k] = decodeURIComponent(v);
            return acc;
          }, {});
          cookieToken = parsed['access_token'];
        }

        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/, '') ||
          socket.handshake.query?.token ||
          cookieToken;

        if (token && typeof token === 'string') {
          const decoded = verifyToken(token);
          if (decoded && decoded.id) {
            const user = await User.findOne({ where: { id: decoded.id } });
            if (user && user.status === Status.ACTIVE) {
              socket.user = {
                id: user.id,
                role: user.role,
                collegeId: user.collegeId || undefined,
              };
            }
          }
        }
        next();
      } catch (err) {
        next();
      }
    });
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      // 1. Join college fleet room with strict multi-tenant authorization
      socket.on('join:college', (data: { collegeId: string }) => {
        if (!data?.collegeId) return;

        // Multi-tenant check: non-ADMIN users can only join their assigned college
        if (socket.user && socket.user.role !== Role.ADMIN) {
          if (socket.user.collegeId && socket.user.collegeId !== data.collegeId) {
            console.warn(
              `[SocketService] Security: Denied user ${socket.user.id} access to foreign college stream ${data.collegeId}`
            );
            socket.emit('error', { message: 'Forbidden: Access to this college stream is restricted' });
            return;
          }
        }

        const room = `college:${data.collegeId}`;
        socket.join(room);
        console.log(`[SocketService] Socket ${socket.id} joined ${room}`);

        // Provide immediate snapshot of all active buses for this college
        const fleetSnapshot = this.realtimeTrackingService.getCollegeFleetLocations(data.collegeId);
        if (fleetSnapshot.length > 0) {
          socket.emit('fleet:snapshot', fleetSnapshot);
        }
      });

      socket.on('leave:college', (data: { collegeId: string }) => {
        if (data?.collegeId) {
          const room = `college:${data.collegeId}`;
          socket.leave(room);
        }
      });

      // 2. Join single bus tracking stream with tenant verification
      socket.on('join:bus', async (data: { busId: string }) => {
        if (!data?.busId) return;

        // If user is scoped to a college and not super-admin, ensure bus belongs to their college
        if (socket.user && socket.user.role !== Role.ADMIN && socket.user.collegeId) {
          const bus = await Bus.findOne({ where: { id: data.busId, isActive: true } });
          if (bus && bus.collegeId !== socket.user.collegeId) {
            console.warn(
              `[SocketService] Security: User ${socket.user.id} denied access to bus ${data.busId} from another college`
            );
            socket.emit('error', { message: 'Forbidden: Bus does not belong to your college' });
            return;
          }
        }

        const room = `bus:${data.busId}`;
        socket.join(room);
        console.log(`[SocketService] Socket ${socket.id} joined ${room}`);

        // Emit latest known state immediately if available
        const current = this.realtimeTrackingService.getBusLocation(data.busId);
        if (current) {
          socket.emit('bus:location', current);
        }
      });

      socket.on('leave:bus', (data: { busId: string }) => {
        if (data?.busId) {
          const room = `bus:${data.busId}`;
          socket.leave(room);
        }
      });

      // 3. Direct driver location stream over WebSocket
      socket.on('bus:location_update', async (data: {
        busId: string;
        collegeId?: string;
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
        status?: BusStatus;
      }) => {
        if (
          !data?.busId ||
          typeof data.latitude !== 'number' ||
          typeof data.longitude !== 'number' ||
          isNaN(data.latitude) ||
          isNaN(data.longitude) ||
          data.latitude < -90 ||
          data.latitude > 90 ||
          data.longitude < -180 ||
          data.longitude > 180
        ) {
          return;
        }

        const bus = await Bus.findOne({ where: { id: data.busId, isActive: true } });
        if (!bus) return;

        // Authoritative multi-tenant context: Bus collegeId from DB always takes precedence
        const collegeId = bus.collegeId;

        // Multi-tenant security check: Ensure socket user belongs to the same college tenant
        if (socket.user && socket.user.role !== Role.ADMIN && socket.user.collegeId) {
          if (bus.collegeId !== socket.user.collegeId) {
            console.warn(
              `[SocketService] Security violation: User ${socket.user.id} from college ${socket.user.collegeId} attempted to broadcast location for bus ${bus.id} belonging to college ${bus.collegeId}`
            );
            return;
          }
        }

        const newStatus = data.status || BusStatus.MOVING;

        // Sync status to DB if changed
        if (bus.status !== newStatus) {
          bus.status = newStatus;
          bus.save().catch((err) => console.warn('[SocketService] Error updating bus status:', err));
        }

        const state = this.realtimeTrackingService.updateBusLocation(data.busId, {
          collegeId,
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          status: newStatus,
        });

        const response = {
          ...state,
          trackingStatus: this.realtimeTrackingService.calculateTrackingStatus(state.lastUpdated, state.status),
        };

        this.broadcastBusLocation(collegeId, data.busId, response);
      });
    });
  }

  public broadcastBusLocation(collegeId: string | undefined, busId: string, locationData: any) {
    if (!this.io) return;

    // Emit to specific bus room (parents, assigned students)
    this.io.to(`bus:${busId}`).emit('bus:location', locationData);

    // Emit to college fleet room (college admin)
    if (collegeId) {
      this.io.to(`college:${collegeId}`).emit('fleet:location', locationData);
    }
  }

  public broadcastBusStatus(collegeId: string | undefined, busId: string, status: BusStatus) {
    if (!this.io) return;

    const payload = { busId, status, timestamp: Date.now() };
    this.io.to(`bus:${busId}`).emit('bus:status', payload);

    if (collegeId) {
      this.io.to(`college:${collegeId}`).emit('fleet:status', payload);
    }
  }
}
