import { Controller, Get, Response, Route, Tags } from 'tsoa';
import { injectable } from 'tsyringe';
import { AppDataSource } from '../config/database.config';

export interface HealthResponse {
  status: 'ok' | 'error';
  message: string;
  timestamp: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
    error?: string;
  };
}

@Route('health')
@Tags('Health')
@injectable()
export class HealthController extends Controller {
  /**
   * System health check and database connectivity diagnostic.
   *
   * ### Intent & Business Purpose
   * Provides real-time operational status of the backend API service and connected PostgreSQL database. Used by load balancers, monitoring tools, devops pipelines, and frontend apps to check system readiness.
   *
   * ### Target Audience & Roles
   * - **Allowed Roles:** Public / Unauthenticated.
   * - **Access Control:** Open endpoint. No JWT or session cookie required.
   *
   * ### Key Rules & Behavior
   * - Executes a lightweight `SELECT 1` query against PostgreSQL via TypeORM (`AppDataSource`).
   * - Measures database query response latency in milliseconds.
   * - Returns HTTP status `200 OK` when healthy, or HTTP status `503 Service Unavailable` if database connection fails or datasource is uninitialized.
   *
   * ### Edge Cases & QA Testing Focus
   * - Verify HTTP 503 status code is returned when the database connection is interrupted.
   * - Confirm process uptime counter resets only on server restarts.
   *
   * @Response<HealthResponse>(200, "System and database are fully operational.")
   * @Response<HealthResponse>(503, "Database connection is down or uninitialized.")
   */
  @Get('/')
  public async getHealth(): Promise<HealthResponse> {
    const startTime = Date.now();
    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbError: string | undefined;
    let latencyMs: number | undefined;

    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.query('SELECT 1');
        dbStatus = 'connected';
        latencyMs = Date.now() - startTime;
      } else {
        dbError = 'Data Source not initialized';
      }
    } catch (err: any) {
      dbStatus = 'disconnected';
      dbError = err.message || 'Database connection error';
    }

    const isHealthy = dbStatus === 'connected';
    if (!isHealthy) {
      this.setStatus(503);
    }

    return {
      status: isHealthy ? 'ok' : 'error',
      message: isHealthy ? 'Application and database are healthy' : 'Database health check failed',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatus,
        ...(latencyMs !== undefined && { latencyMs }),
        ...(dbError && { error: dbError }),
      },
    };
  }
}
