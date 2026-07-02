const express = require('express');
const { query } = require('../lib/db');
const { authMiddleware } = require('../lib/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, agent_id, name, platform, status, last_seen, created_at FROM devices WHERE owner_id = $1 ORDER BY last_seen DESC',
      [req.user.userId]
    );
    res.json({ devices: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to list devices.' });
  }
});

router.post('/register', async (req, res) => {
  const { agent_id, name, platform, status } = req.body;
  if (!agent_id || !name || !platform) {
    return res.status(400).json({ error: 'agent_id, name, and platform are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO devices (owner_id, agent_id, name, platform, status, last_seen)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (agent_id) DO UPDATE SET name = EXCLUDED.name, platform = EXCLUDED.platform, status = EXCLUDED.status, last_seen = NOW()
       RETURNING id, agent_id, name, platform, status, last_seen`,
      [req.user.userId, agent_id, name, platform, status || 'online']
    );
    res.json({ device: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to register device.' });
  }
});

router.post('/heartbeat', async (req, res) => {
  const { agent_id, status } = req.body;
  if (!agent_id) {
    return res.status(400).json({ error: 'agent_id is required.' });
  }
  try {
    const result = await query(
      'UPDATE devices SET status = $1, last_seen = NOW() WHERE agent_id = $2 AND owner_id = $3 RETURNING id, agent_id, status, last_seen',
      [status || 'online', agent_id, req.user.userId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Device not found.' });
    }
    res.json({ device: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to update heartbeat.' });
  }
});

module.exports = router;
