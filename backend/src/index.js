import express from 'express';
import cors from 'cors';
import './db.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import stationRoutes from './routes/stations.js';
import paymentRoutes from './routes/payments.js';
import dashboardRoutes from './routes/dashboard.js';
import reportRoutes from './routes/reports.js';
import staffRoutes from './routes/staff.js';
import auditRoutes from './routes/audit.js';
import publicRoutes from './routes/public.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gaming-center-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/settings', settingsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Gaming Center API running at http://localhost:${PORT}`);
});
