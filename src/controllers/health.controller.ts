import { Controller, Get, Route, Tags } from 'tsoa';
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
