import { Router } from 'express';
import db from '../db.js';
import { getSetting } from '../utils/pricing.js';

const router = Router();

router.get('/info', (_req, res) => {
  res.json({
    name: getSetting('center_name', 'Nexus Gaming Center'),
    address: getSetting('center_address'),
    phone: getSetting('center_phone'),
    email: getSetting('center_email'),
    hours: getSetting('center_hours', 'Open 24/7'),
    about: 'Nexus Gaming Center is a premium 24/7 gaming destination featuring high-end PCs, console zones, and a vibrant community for gamers of all levels.',
    features: [
      'High-performance gaming PCs',
      'Console gaming zones (PS5, Xbox)',
      'Private tournament rooms',
      'Snacks and refreshments',
      'Air-conditioned comfort',
      '24/7 operation',
    ],
    gallery: [
      { title: 'Main Gaming Floor', description: 'Spacious setup with RGB lighting and ergonomic chairs' },
      { title: 'Console Zone', description: 'Latest-gen consoles with 4K displays' },
      { title: 'Tournament Arena', description: 'Competitive space for esports events' },
      { title: 'Lounge Area', description: 'Relax between sessions with friends' },
    ],
  });
});

router.get('/settings', (_req, res) => {
  const settings = db.prepare('SELECT key, value FROM settings').all();
  const publicSettings = {};
  for (const row of settings) {
    if (['center_name', 'center_address', 'center_phone', 'center_email', 'center_hours'].includes(row.key)) {
      publicSettings[row.key] = row.value;
    }
  }
  res.json(publicSettings);
});

export default router;
