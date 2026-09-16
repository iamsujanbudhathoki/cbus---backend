import express, { urlencoded } from 'express';
import swaggerUi from 'swagger-ui-express';
import { RegisterRoutes } from '../routes/routes';
import errorHandler from '../middlewares/errorhandler.middleware';
import { DotenvConfig, Environment } from '../config/env.config';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerDocument from '../../public/swagger.json';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
export const configMiddleware = (app: express.Application) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',
    'https://cbus-xi.vercel.app',
    DotenvConfig.FRONTEND_BASE_URL,
  ].filter((url, index, self) => Boolean(url) && self.indexOf(url) === index);

  const corsOptions: cors.CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  };

  app.use(cookieParser());
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(compression());

  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 10 minutes
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 10 minutes).
    standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  });
  app.use(limiter);
  app.use(
    urlencoded({
      extended: true,
    }),
  );

  if (DotenvConfig.NODE_ENV === Environment.DEVELOPMENT) {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    app.use('/swagger-json', (req, res) => res.send(swaggerUi));
  }
  app.use(express.static(DotenvConfig.MEDIA_UPLOAD_PATH!));

  RegisterRoutes(app);
  app.use(errorHandler);
};
