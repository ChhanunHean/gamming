import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const items = db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
  res.json(items);
});

router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

router.post('/', (req, res) => {
  const { title, description = '' } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const result = db
    .prepare('INSERT INTO items (title, description) VALUES (?, ?)')
    .run(title.trim(), description.trim());

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.put('/:id', (req, res) => {
  const { title, description = '' } = req.body;
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.prepare('UPDATE items SET title = ?, description = ? WHERE id = ?').run(
    title.trim(),
    description.trim(),
    req.params.id
  );

  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  res.json(item);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }

  res.status(204).send();
});

export default router;
