import express from 'express';
import http from 'http';
import 'reflect-metadata';
import { container } from 'tsyringe';
import { AppDataSource } from './config/database.config';
import { DotenvConfig } from './config/env.config';
import { configMiddleware } from './middlewares';
import { PathUtils } from './utils/path.util';
import { SocketService } from './services/socket.service';

class Server {
  constructor() {
    this.bootstrap();
  }

  // bootstrap
  async bootstrap() {
    await this.initializePath();
    AppDataSource.initialize()
      .then(() => {
        console.log('Data Source has been initialized!');
        const app = express();
        configMiddleware(app);

        const httpServer = http.createServer(app);
        const socketService = container.resolve(SocketService);
        socketService.init(httpServer);

        httpServer.listen(DotenvConfig.PORT, () => {
          console.log(`TCP server established on port ${DotenvConfig.PORT} with WebSockets enabled`);
        });
      })
      .catch((err) => {
        console.error('Error during Data Source initialization', err);
      });
  }

  async initializePath() {
    await PathUtils.ensureDir(DotenvConfig.TEMP_FOLDER_PATH);
    await PathUtils.ensureDir(DotenvConfig.MEDIA_TEMP_PATH);
    await PathUtils.ensureDir(DotenvConfig.MEDIA_UPLOAD_PATH!);
  }
}

new Server();
