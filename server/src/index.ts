import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { requireAuth } from './auth';
import { pool } from './db';
import { catalogRouter } from './routes/catalog';
import { internalSyncRouter } from './routes/internalSync';
import { ensureLoaded } from './suggest';

dotenv.config();

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '10kb' }));

// Public on purpose: Render's health check + confirms Postgres is reachable.
app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    return res.status(200).json({
      status: 'ok',
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    console.error('Database connection failed:', err);

    return res.status(500).json({
      status: 'error',
      message: 'Database unreachable',
    });
  }
});

app.use(internalSyncRouter);
app.use(requireAuth);
app.use(catalogRouter);

app.use(
  (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(500).json({
      error: 'Internal server error',
    });
  },
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  ensureLoaded().catch((err) => {
    console.error('Suggest warm-up failed:', err);
  });
});
