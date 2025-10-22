const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const FILE = path.join(__dirname, 'runtime-config.json');

function readRuntime() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { debug: process.env.DEBUG === 'true' }; }
}

function writeRuntime(cfg) {
  fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

router.get('/debug', (req, res) => {
  const cfg = readRuntime();
  res.json({ debug: !!cfg.debug });
});

router.patch('/debug', express.json(), (req, res) => {
  const secret = req.headers['x-admin-secret'] || '';
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { debug } = req.body;
  const cfg = readRuntime();
  cfg.debug = !!debug;
  writeRuntime(cfg);
  res.json({ debug: cfg.debug });
});

module.exports = router;
