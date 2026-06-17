import { Router } from 'express';
import { queryAll } from '../db.js';
import { getSetting } from '../utils/pricing.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/info', asyncHandler(async (_req, res) => {
  res.json({
    name: await getSetting('center_name', 'Nexus Gaming Center'),
    address: await getSetting('center_address'),
    phone: await getSetting('center_phone'),
    email: await getSetting('center_email'),
    hours: await getSetting('center_hours', 'Open 24/7'),
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
}));

router.get('/settings', asyncHandler(async (_req, res) => {
  const settings = await queryAll('SELECT key, value FROM settings');
  const publicSettings = {};
  for (const row of settings) {
    if (['center_name', 'center_address', 'center_phone', 'center_email', 'center_hours'].includes(row.key)) {
      publicSettings[row.key] = row.value;
    }
  }
  res.json(publicSettings);
}));

export default router;
