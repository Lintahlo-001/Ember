import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { pool } from './db';

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});