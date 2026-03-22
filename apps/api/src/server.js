import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { router } from './routes/index.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.webUrl }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', router);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal error' });
});

app.listen(env.port, () => {
  console.log(`API started at http://localhost:${env.port}`);
});
