import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { pool } from './db';
import { catalogRouter } from './routes/catalog';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Confirms Express can actually reach Postgres through the pooler
app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (err) {
    console.error('Database connection failed:', err);
    res.status(500).json({ status: 'error', message: 'Database unreachable' });
  }
});

app.use(catalogRouter);

// Last-resort handler: log details server-side, never leak them to the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});