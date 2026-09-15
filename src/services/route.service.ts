import { singleton } from 'tsyringe';
import { Route, RouteStop } from '../entities';
import { Status } from '../types/enums';
import { AppError } from '../utils/appError.util';
import { AppDataSource } from '../config/database.config';

export interface CreateRouteDTO {
  collegeId: string;
  name: string;
  description?: string;
  stops?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    sequence?: number;
    estimatedTime?: string;
  }>;
}

export interface UpdateRouteDTO {
  name?: string;
  description?: string;
  status?: Status;
  stops?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    sequence?: number;
    estimatedTime?: string;
  }>;
}

export interface AddRouteStopDTO {
  routeId: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence?: number;
  estimatedTime?: string;
}

@singleton()
export class RouteService {
  async getRoutesByCollege(collegeId?: string): Promise<Route[]> {
    const query = Route.createQueryBuilder('route')
      .leftJoinAndSelect('route.stops', 'stops')
      .where('route.status != :status', { status: Status.DEACTIVATED });

    if (collegeId) {
      query.andWhere('route.collegeId = :collegeId', { collegeId });
    }

    const routes = await query.orderBy('route.name', 'ASC').getMany();
    // Sort stops sequence ascending
    routes.forEach((r) => {
      if (r.stops) {
        r.stops.sort((a, b) => a.sequence - b.sequence);
      }
    });

    return routes;
  }

  async getRouteById(id: string, tenantCollegeId?: string): Promise<Route | null> {
    const route = await Route.findOne({
      where: { id },
      relations: ['stops'],
    });

    if (!route) return null;
    if (tenantCollegeId && route.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot access data outside your authorized college scope');
    }

    if (route.stops) {
      route.stops.sort((a, b) => a.sequence - b.sequence);
    }

    return route;
  }

  async createRoute(dto: CreateRouteDTO): Promise<Route> {
    return await AppDataSource.transaction(async (manager) => {
      const route = manager.create(Route, {
        collegeId: dto.collegeId,
        name: dto.name,
        description: dto.description || undefined,
        status: Status.ACTIVE,
      });

      const savedRoute = await manager.save(route);

      if (dto.stops && dto.stops.length > 0) {
        for (let i = 0; i < dto.stops.length; i++) {
          const stopDto = dto.stops[i];
          const stop = manager.create(RouteStop, {
            routeId: savedRoute.id,
            name: stopDto.name,
            latitude: Number(stopDto.latitude),
            longitude: Number(stopDto.longitude),
            sequence: stopDto.sequence ?? (i + 1),
            estimatedTime: stopDto.estimatedTime || undefined,
            status: Status.ACTIVE,
          });
          await manager.save(stop);
        }
      }

      return (await this.getRouteById(savedRoute.id)) as Route;
    });
  }

  async updateRoute(id: string, dto: UpdateRouteDTO, tenantCollegeId?: string): Promise<Route> {
    return await AppDataSource.transaction(async (manager) => {
      const route = await manager.findOne(Route, { where: { id } });
      if (!route) throw AppError.notFound('Route not found');
      if (tenantCollegeId && route.collegeId !== tenantCollegeId) {
        throw AppError.forbidden('Cannot modify route outside your authorized college scope');
      }

      if (dto.name !== undefined) route.name = dto.name;
      if (dto.description !== undefined) route.description = dto.description;
      if (dto.status !== undefined) route.status = dto.status;

      await manager.save(route);

      if (dto.stops !== undefined) {
        await manager.delete(RouteStop, { routeId: id });
        for (let i = 0; i < dto.stops.length; i++) {
          const stopDto = dto.stops[i];
          const stop = manager.create(RouteStop, {
            routeId: id,
            name: stopDto.name,
            latitude: Number(stopDto.latitude),
            longitude: Number(stopDto.longitude),
            sequence: stopDto.sequence ?? (i + 1),
            estimatedTime: stopDto.estimatedTime || undefined,
            status: Status.ACTIVE,
          });
          await manager.save(stop);
        }
      }

      return (await this.getRouteById(id)) as Route;
    });
  }

  async addStop(dto: AddRouteStopDTO, tenantCollegeId?: string): Promise<RouteStop> {
    const route = await Route.findOne({ where: { id: dto.routeId } });
    if (!route) throw AppError.notFound('Route not found');
    if (tenantCollegeId && route.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot add stop to route outside your authorized college scope');
    }

    let sequence = dto.sequence;
    if (!sequence) {
      const existingStopsCount = await RouteStop.count({ where: { routeId: dto.routeId } });
      sequence = existingStopsCount + 1;
    }

    const stop = new RouteStop();
    stop.routeId = dto.routeId;
    stop.name = dto.name;
    stop.latitude = Number(dto.latitude);
    stop.longitude = Number(dto.longitude);
    stop.sequence = sequence;
    stop.estimatedTime = dto.estimatedTime || '';
    stop.status = Status.ACTIVE;

    return await stop.save();
  }

  async deleteStop(stopId: string, tenantCollegeId?: string): Promise<boolean> {
    const stop = await RouteStop.findOne({ where: { id: stopId }, relations: ['route'] });
    if (!stop) throw AppError.notFound('Route stop not found');
    if (tenantCollegeId && stop.route && stop.route.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot delete stop from route outside your authorized college scope');
    }
    await stop.remove();
    return true;
  }

  async deleteRoute(id: string, tenantCollegeId?: string): Promise<boolean> {
    const route = await Route.findOne({ where: { id } });
    if (!route) throw AppError.notFound('Route not found');
    if (tenantCollegeId && route.collegeId !== tenantCollegeId) {
      throw AppError.forbidden('Cannot delete route outside your authorized college scope');
    }
    route.status = Status.DEACTIVATED;
    await route.save();
    return true;
  }
}
