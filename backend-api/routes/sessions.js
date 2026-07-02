const express = require('express');
const { query } = require('../lib/db');
const { authMiddleware, internalApiKeyMiddleware } = require('../lib/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.agent_id, s.viewer_socket_id, s.status, s.created_at, s.ended_at
       FROM sessions s
       JOIN devices d ON d.agent_id = s.agent_id
       WHERE d.owner_id = $1
       ORDER BY s.created_at DESC
       LIMIT 50`,
      [req.user.userId]
    );
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to load sessions.' });
  }
});

router.post('/create', internalApiKeyMiddleware, async (req, res) => {
  const { agent_id, viewer_socket_id } = req.body;
  if (!agent_id || !viewer_socket_id) {
    return res.status(400).json({ error: 'agent_id and viewer_socket_id are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO sessions (agent_id, viewer_socket_id, status) VALUES ($1, $2, 'active')
       RETURNING id, agent_id, viewer_socket_id, status, created_at`,
      [agent_id, viewer_socket_id]
    );
    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to create session.' });
  }
});

router.post('/end', internalApiKeyMiddleware, async (req, res) => {
  const { agent_id, viewer_socket_id } = req.body;
  if (!agent_id || !viewer_socket_id) {
    return res.status(400).json({ error: 'agent_id and viewer_socket_id are required.' });
  }

  try {
    const result = await query(
      `UPDATE sessions SET status = 'ended', ended_at = NOW()
       WHERE agent_id = $1 AND viewer_socket_id = $2 AND ended_at IS NULL
       RETURNING id, agent_id, viewer_socket_id, status, created_at, ended_at`,
      [agent_id, viewer_socket_id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Session not found or already ended.' });
    }
    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to end session.' });
  }
});

module.exports = router;
