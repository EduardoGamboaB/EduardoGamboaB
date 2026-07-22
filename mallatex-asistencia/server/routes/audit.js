// Bitácora / trazabilidad (consulta).
import express from 'express';
import * as db from '../db.js';

const router = express.Router();

router.get('/audit', (req, res) => {
  let items = db.all('audit');
  if (req.query.entity) items = items.filter((a) => a.entity === req.query.entity);
  if (req.query.action) items = items.filter((a) => a.action === req.query.action);
  items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  res.json(items.slice(0, limit));
});

export default router;
